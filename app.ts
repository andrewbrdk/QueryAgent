class XMain extends HTMLElement {
	#login: XLogin;
	#queryagent: XQueryagent;

	constructor() {
		super();
		this.innerHTML = `
			<x-login></x-login>
			<x-queryagent></x-queryagent>
		`;
		this.#queryagent = this.querySelector('x-queryagent') as XQueryagent;
		this.#login = this.querySelector('x-login') as XLogin;
		this.#login.hidden = true;
		this.#queryagent.hidden = true;
		this.addEventListener('loginsuccess', (e) => {
			this.renderPage();
		});
		this.renderPage();
	}

	async renderPage() {
		let res = await fetch('/checkauth');
		const statusCode = res.status;
		if (statusCode == 200) {
			this.#queryagent.hidden = false;
			this.#login.hidden = true;
			this.#queryagent.render();
		} else if (statusCode == 401) { // unauthorized
			this.#login.hidden = false;
			this.#queryagent.hidden = true;
		} else {
			this.#queryagent.hidden = true;
		}
	}
}

class XLogin extends HTMLElement {
	constructor() {
		super();
		this.innerHTML = `
			<h1>Query Agent</h1>
			<form>
				<label for="password">Password:</label>
				<input type="password" id="password" name="password" required>
				<button type="button">Login</button>
				<br/>
				<div id="invalidpassword" style="display: none;">Invalid Password</div>
			</form>
		`;
		(this.querySelector('form') as HTMLFormElement).onsubmit = (e) => {
			e.preventDefault();
			this.submitLogin();
		};
		(this.querySelector('button') as HTMLButtonElement).onclick = (e) => {
			e.preventDefault();
			this.submitLogin();
		};
	}

	async submitLogin() {
		const password = (this.querySelector('#password') as HTMLInputElement).value;
		const response = await fetch('/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ password }),
		});
		if (response.ok) {
			(this.querySelector('#invalidpassword') as HTMLElement).style.display = "none";
			this.dispatchEvent(new CustomEvent('loginsuccess', { bubbles: true }));
		} else {
            let e = this.querySelector('#invalidpassword') as HTMLElement;
			e.style.display = "inline";
			setTimeout(() => {e.style.display = "none";}, 3000);
		}
	}
}

interface SQLResult {                                                                                                   
    column_names: string[];                                                                                             
    column_types: string[];                                                                                             
    rows: unknown[][];                                                                                                  
    truncated: boolean;                                                                                                 
}                                                                                                                       
                                                                                                                        
interface LLMPayload {                                                                                                  
    sql?: string;                                                                                                       
    outline?: string;                                                                                                   
} 

class XQueryagent extends HTMLElement {
	#messageinput: HTMLInputElement;
	#sendmessage: HTMLButtonElement;
	#isSendingMessage: boolean = false;
	#sendstatus: HTMLElement;
	#sendstatusmsg: HTMLElement;
	#response: HTMLElement;
	#sqlcode: HTMLTextAreaElement;
	#execstatus: HTMLElement;
	#execstatusmsg: HTMLElement;
	#exec: HTMLElement;
	#execresult: HTMLElement;

	constructor() {
		super();
		this.innerHTML = `
			<h1>Query Agent</h1>
			<section id="prompt">
				<div class="label">Message:</div>
				<textarea id="messageinput" class="mainarea" placeholder="Send a message to generate a query."></textarea>
				<div class="btns">
					<button id="sendmessage" type="button">Send</button>
				</div>
			</section>
			<section id="sendstatus" hidden>
				<div class="label"></div>
				<div id="sendstatusmsg" class="mainarea"></div>
				<div class="btns"></div>
			</section>
			<section id="response" hidden>
				<div class="label">Query:</div>
				<textarea id="sqlcode" class="mainarea"></textarea>
				<div class="btns">
					<button id="copysql" type="button">Copy</button>
					<button id="executesql" type="button">Run</button>
					<button id="fixsql" type="button" title="Send the message, query, and execution error to the LLM to generate a new query.">Fix</button>
				</div>
			</section>
			<section id="execstatus" hidden>
				<div class="label"></div>
				<div id="execstatusmsg" class="mainarea"></div>
				<div class="btns"></div>
			</section>
			<section id="exec" hidden>
				<div class="label">Results:</div>
				<div id="execresult" class="mainarea"></div>
				<div class="btns">
					<button id="closeresults" type="button">Close</button>
				</div>
			</section>`;
		this.#messageinput = this.querySelector('#messageinput') as HTMLInputElement;
		this.#sendmessage = this.querySelector('#sendmessage') as HTMLButtonElement;
		this.#sendstatus = this.querySelector('#sendstatus') as HTMLElement;
		this.#sendstatusmsg = this.querySelector('#sendstatusmsg') as HTMLElement;
		this.#response = this.querySelector('#response') as HTMLElement;
		this.#sqlcode = this.querySelector('#sqlcode') as HTMLTextAreaElement;
		this.#execstatus = this.querySelector('#execstatus') as HTMLElement;
		this.#execstatusmsg = this.querySelector('#execstatusmsg') as HTMLElement;
		this.#exec = this.querySelector('#exec') as HTMLElement;
		this.#execresult = this.querySelector('#execresult') as HTMLElement;
	}

	async render() {
		this.bindEvents();
	}

	bindEvents() {
		this.unbindEvents();

		this.#sendmessage.onclick = async () => {
			await this.sendMessage();
		};
		this.#messageinput.onkeydown = async (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				await this.sendMessage();
			}
		};
		(this.querySelector("#copysql") as HTMLButtonElement).onclick = () => {
			navigator.clipboard.writeText(this.#sqlcode.value || "");
		};
		(this.querySelector("#executesql") as HTMLButtonElement).onclick = async () => {
			await this.executeSQLForMessage();
		};
		(this.querySelector("#fixsql") as HTMLButtonElement).onclick = async () => {
			await this.fixSQL();
		};
		(this.querySelector("#closeresults") as HTMLButtonElement).onclick = () => {
			this.#exec.hidden = true;
			this.#execresult.innerHTML = "";
		};
	}

	unbindEvents() {
		this.querySelectorAll('button').forEach(btn => btn.onclick = null);
		if (this.#messageinput) this.#messageinput.onkeydown = null;
	}

	async sendMessage() {
		if (this.#isSendingMessage) return;
		this.#sendstatusmsg.innerHTML = "";
		this.#sendstatus.hidden = false;
		this.#response.hidden = true;
		this.#execstatus.hidden = true;
		this.#exec.hidden = true;
		const text = this.#messageinput.value.trim();
		if (!text) {
			this.#sendstatusmsg.innerHTML = `<div class="errmsg">Message can't be empty.</div>`;
			return;
		}
		this.#isSendingMessage = true;
		this.#messageinput.disabled = true;
		this.#sendmessage.disabled = true;
		this.#sendstatusmsg.innerHTML = `<em>Waiting for response ...</em>`;

		try {
			const res = await fetch('/message', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text }),
			});
			if (!res.ok) {
				this.#sendstatusmsg.innerHTML = `<div class="errmsg">Failed to send message.</div>`;
				return;
			}
			const payload = await res.json() as LLMPayload;
			this.#sendstatus.hidden = true;
			this.#response.hidden = false;
			this.#sqlcode.value = payload.sql ?? "";
		} catch (e) {
			this.#sendstatusmsg.innerHTML = `<div class="errmsg">Failed to send message.</div>`;
		} finally {
			this.#isSendingMessage = false;
			this.#messageinput.disabled = false;
			this.#sendmessage.disabled = false;
		}
	}

	async executeSQLForMessage() {
		const button: HTMLButtonElement = this.querySelector("#executesql") as HTMLButtonElement;
		button.disabled = true;
		this.#execstatusmsg.innerHTML = "";
		this.#execstatus.hidden = false;
		this.#exec.hidden = true;
		const sql = this.#sqlcode.value || "";
		if (!sql) {
			this.#execstatusmsg.innerHTML = `<div class="errmsg">No SQL to execute.</div>`;
			button.disabled = false;
			return;
		}

		try {
			const res = await fetch("/execute", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sql: sql }),
			});
			if (!res.ok) {
				const txt = await res.text() as string;
				this.#execstatusmsg.innerHTML = `<div class="errmsg">${escapeHTML(txt || "Execution failed.")}</div>`;
				return;
			}
			const payload = await res.json() as SQLResult;
			this.renderExecRows(payload);
			this.#exec.hidden = false;
			this.#execstatus.hidden = true;
		} catch (e) {
			this.#execstatusmsg.innerHTML = `<div class="errmsg">Execution failed.</div>`;
		} finally {
			button.disabled = false;
		}
	}

	async fixSQL() {
		const sql = this.#sqlcode.value || "";
		const text = this.#messageinput.value.trim();
		const error = this.#execstatusmsg.textContent?.trim() ?? "";
		this.#sendstatus.hidden = false;
		this.#sendstatusmsg.innerHTML = `<em>Fixing SQL ...</em>`;
		this.#response.hidden = true;
		this.#exec.hidden = true;
		this.#execstatus.hidden = true;
		try {
			const res = await fetch('/fix', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text, sql, error }),
			});
			if (!res.ok) {
				this.#sendstatusmsg.innerHTML = `<div class="errmsg">Fix request failed.</div>`;
				return;
			}
			const payload = await res.json() as LLMPayload;
			this.#sendstatus.hidden = true;
			this.#response.hidden = false;
			this.#sqlcode.value = payload.sql ?? "";
		} catch (e) {
			this.#sendstatusmsg.innerHTML = `<div class="errmsg">Fix request failed.</div>`;
		}
	}

	renderExecRows(res: SQLResult) {
		const columnNames = Array.isArray(res.column_names) ? res.column_names : [];
		const columnTypes = Array.isArray(res.column_types) ? res.column_types : [];
		const rows = Array.isArray(res.rows) ? res.rows : [];
		const truncated = res.truncated === true;
		if (columnNames.length === 0 && rows.length === 0) {
			this.#execresult.innerHTML = `<div class="sql-empty">No rows returned.</div>`;
			return;
		}
		const numericTypes = new Set(["int2", "int4", "int8", "float4", "float8", "numeric"]);
		const ths = columnNames.map((name, i) => {
			const type = columnTypes[i] ?? "";
			const isNumeric = numericTypes.has(type) ? 'numeric' : '';
			return `<th class="${isNumeric}">${escapeHTML(name)}</th>`;
		});
		const head = `<thead><tr>${ths.join("")}</tr></thead>`;
		const trs = rows.map((row) => {
			const tds = row.map((v, i) => {
				let s;
				if (v == null) {
					s = "NULL";
				} else if (typeof v === "object") {
					s = JSON.stringify(v);
				} else {
					s = String(v);
				}
				const type = columnTypes[i] ?? "";
				const isNumeric = numericTypes.has(type) ? 'numeric' : '';
				return `<td class="${isNumeric}">${escapeHTML(s)}</td>`;
			});
			return `<tr>${tds.join("")}</tr>`;
		});
		const body = `<tbody>${trs.join("")}</tbody>`;
		const truncatedMsg = truncated
			? `<div class="infomsg">Results are limited to ${rows.length} rows.</div>`
			: "";
		this.#execresult.innerHTML = `
			${truncatedMsg}
			<table>
				${head}
				${body}
			</table>`;
	}
}

function escapeHTML(str: string): string {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
}

customElements.define('x-main', XMain);
customElements.define('x-login', XLogin);
customElements.define('x-queryagent', XQueryagent);