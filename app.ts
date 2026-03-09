import vegaEmbed, { VisualizationSpec } from 'vega-embed';

class XMain extends HTMLElement {
	#login: XLogin;
	#dataagents: XDataAgents;
	#queryagent: XQueryAgent;
	#chartagent: XChartAgent;

	constructor() {
		super();
		this.innerHTML = `
			<x-login></x-login>
			<x-dataagents></x-dataagents>
			<x-queryagent></x-queryagent>
			<x-chartagent></x-chartagent>
		`;
		this.#login = this.querySelector('x-login') as XLogin;
		this.#dataagents = this.querySelector('x-dataagents') as XDataAgents;
		this.#queryagent = this.querySelector('x-queryagent') as XQueryAgent;
		this.#chartagent = this.querySelector('x-chartagent') as XChartAgent;
		this.#login.hidden = true;
		this.#dataagents.hidden = true;
		this.#queryagent.hidden = true;
		this.#chartagent.hidden = true;
		this.addEventListener('loginsuccess', () => {
			this.renderPage();
		});
		this.renderPage();
	}

	async renderPage() {
		let res = await fetch('/checkauth');
		const statusCode = res.status;
		if (statusCode == 401) {
			this.#login.hidden = false;
			this.#dataagents.hidden = true;
			this.#queryagent.hidden = true;
			this.#chartagent.hidden = true;
			return;
		}
		const path = window.location.pathname;
		this.#login.hidden = true;
		if (path === '/chart') {
			this.#dataagents.hidden = true;
			this.#queryagent.hidden = true;
			this.#chartagent.hidden = false;
			this.#chartagent.render();
		} else if (path === '/query') {
			this.#dataagents.hidden = true;
			this.#queryagent.hidden = false;
			this.#chartagent.hidden = true;
			this.#queryagent.render();
		} else {
			history.pushState(null, '', '/');
			this.#dataagents.hidden = false;
			this.#queryagent.hidden = true;
			this.#chartagent.hidden = true;
			this.#dataagents.render();
		}
	}
}

class XLogin extends HTMLElement {
	constructor() {
		super();
		this.innerHTML = `
			<h1>Data Agents</h1>
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
			setTimeout(() => { e.style.display = "none"; }, 3000);
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

interface ChartPayload {
	outline?: string;
	spec?: Record<string, unknown>;
}

interface DashPayload {
	sql: string;
	sql_result: SQLResult;
	chart_outline?: string;
	chart_spec?: Record<string, unknown>;
}

class XDataAgents extends HTMLElement {
	#input: HTMLTextAreaElement;
	#send: HTMLButtonElement;
	#status: HTMLElement;
	#statusmsg: HTMLElement;
	#output: HTMLElement;
	#tabChart: HTMLButtonElement;
	#tabData: HTMLButtonElement;
	#tabSQL: HTMLButtonElement;
	#tabSpec: HTMLButtonElement;
	#panelChart: HTMLElement;
	#panelData: HTMLElement;
	#panelSQL: HTMLTextAreaElement;
	#panelSpec: HTMLTextAreaElement;

	constructor() {
		super();
		this.innerHTML = `
			<h1>Data Agents</h1>
			<section id="dash-prompt">
				<div class="label">Question:</div>
				<textarea id="dash-input" class="mainarea" placeholder="Ask a question about your data..."></textarea>
				<div class="btns">
					<button id="dash-send" type="button">Send</button>
				</div>
			</section>
			<section id="dash-status" hidden>
				<div class="label"></div>
				<div id="dash-statusmsg" class="mainarea"></div>
				<div class="btns"></div>
			</section>
			<section id="dash-output" hidden>
				<div class="label">Result:</div>
				<div id="dash-panel-chart" class="mainarea"></div>
				<div id="dash-panel-data" class="mainarea" hidden></div>
				<textarea id="dash-panel-sql" class="mainarea" hidden></textarea>
				<textarea id="dash-panel-spec" class="mainarea" hidden></textarea>
				<div class="btns">
					<button id="dash-tab-chart" type="button">Result</button>
					<button id="dash-tab-data" type="button">Data</button>
					<button id="dash-tab-sql" type="button">SQL</button>
					<button id="dash-tab-spec" type="button">Vega</button>
				</div>
			</section>
		`;
		this.#input      = this.querySelector('#dash-input') as HTMLTextAreaElement;
		this.#send       = this.querySelector('#dash-send') as HTMLButtonElement;
		this.#status     = this.querySelector('#dash-status') as HTMLElement;
		this.#statusmsg  = this.querySelector('#dash-statusmsg') as HTMLElement;
		this.#output     = this.querySelector('#dash-output') as HTMLElement;
		this.#tabChart   = this.querySelector('#dash-tab-chart') as HTMLButtonElement;
		this.#tabData    = this.querySelector('#dash-tab-data') as HTMLButtonElement;
		this.#tabSQL     = this.querySelector('#dash-tab-sql') as HTMLButtonElement;
		this.#tabSpec    = this.querySelector('#dash-tab-spec') as HTMLButtonElement;
		this.#panelChart = this.querySelector('#dash-panel-chart') as HTMLElement;
		this.#panelData  = this.querySelector('#dash-panel-data') as HTMLElement;
		this.#panelSQL   = this.querySelector('#dash-panel-sql') as HTMLTextAreaElement;
		this.#panelSpec  = this.querySelector('#dash-panel-spec') as HTMLTextAreaElement;
		this.bindEvents();
	}

	async render() {
		//
	}

	bindEvents() {
		this.#send.onclick = () => this.run();
		this.#input.onkeydown = (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.run();
			}
		};
		this.#tabChart.onclick = () => this.switchTab('chart');
		this.#tabData.onclick  = () => this.switchTab('data');
		this.#tabSQL.onclick   = () => this.switchTab('sql');
		this.#tabSpec.onclick  = () => this.switchTab('spec');
	}

	switchTab(tab: 'chart' | 'data' | 'sql' | 'spec') {
		this.#panelChart.hidden = tab !== 'chart';
		this.#panelData.hidden  = tab !== 'data';
		this.#panelSQL.hidden   = tab !== 'sql';
		this.#panelSpec.hidden  = tab !== 'spec';
	}

	showStatus(html: string) {
		this.#status.hidden = false;
		this.#statusmsg.innerHTML = html;
	}

	hideStatus() {
		this.#status.hidden = true;
	}

	async run() {
		const text = this.#input.value.trim();
		if (!text) {
			this.showStatus(`<div class="errmsg">Please enter a question.</div>`);
			return;
		}
		this.#send.disabled = true;
		this.#output.hidden = true;
		this.#panelChart.innerHTML = '';
		this.#panelData.innerHTML = '';
		this.#panelSQL.value = '';
		this.#panelSpec.value = '';
		this.showStatus(`<em>Thinking...</em>`);
		try {
			const res = await fetch('/dash', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text }),
			});
			if (!res.ok) {
				const txt = await res.text();
				this.showStatus(`<div class="errmsg">${escapeHTML(txt || 'Request failed.')}</div>`);
				return;
			}
			const payload = await res.json() as DashPayload;
			const sql = payload.sql ?? '';
			const sqlResult = payload.sql_result;

			this.#panelSQL.value = sql;
			this.renderTable(sqlResult, this.#panelData);

			if (payload.chart_spec) {
				this.#panelSpec.value = JSON.stringify(payload.chart_spec, null, 2);
				const rows = this.buildRows(sqlResult);
				const specWithData = {
					...payload.chart_spec,
					data: { values: rows },
				} as VisualizationSpec;
				this.#panelChart.innerHTML = '';
				await vegaEmbed(this.#panelChart, specWithData, { actions: false });
				this.switchTab('chart');
			} else {
				this.switchTab('data');
			}

			this.#output.hidden = false;
			this.hideStatus();
		} catch (e) {
			this.showStatus(`<div class="errmsg">Something went wrong.</div>`);
		} finally {
			this.#send.disabled = false;
		}
	}

	buildRows(res: SQLResult): Record<string, unknown>[] {
		const cols = res.column_names ?? [];
		return (res.rows ?? []).map(row =>
			Object.fromEntries(cols.map((col, i) => [col, row[i]]))
		);
	}

	renderTable(res: SQLResult, target: HTMLElement) {
		const columnNames = Array.isArray(res.column_names) ? res.column_names : [];
		const columnTypes = Array.isArray(res.column_types) ? res.column_types : [];
		const rows = Array.isArray(res.rows) ? res.rows : [];
		const truncated = res.truncated === true;
		if (columnNames.length === 0 && rows.length === 0) {
			target.innerHTML = `<div class="sql-empty">No rows returned.</div>`;
			return;
		}
		const numericTypes = new Set(["int2", "int4", "int8", "float4", "float8", "numeric"]);
		const ths = columnNames.map((name, i) => {
			const type = columnTypes[i] ?? '';
			const isNumeric = numericTypes.has(type) ? 'numeric' : '';
			return `<th class="${isNumeric}">${escapeHTML(name)}</th>`;
		});
		const head = `<thead><tr>${ths.join('')}</tr></thead>`;
		const trs = rows.map((row) => {
			const tds = (row as unknown[]).map((v, i) => {
				let s: string;
				if (v == null) {
					s = 'NULL';
				} else if (typeof v === 'object') {
					s = JSON.stringify(v);
				} else {
					s = String(v);
				}
				const type = columnTypes[i] ?? '';
				const isNumeric = numericTypes.has(type) ? 'numeric' : '';
				return `<td class="${isNumeric}">${escapeHTML(s)}</td>`;
			});
			return `<tr>${tds.join('')}</tr>`;
		});
		const body = `<tbody>${trs.join('')}</tbody>`;
		const truncatedMsg = truncated
			? `<div class="infomsg">Results are limited to ${rows.length} rows.</div>`
			: '';
		target.innerHTML = `
			${truncatedMsg}
			<table>
				${head}
				${body}
			</table>`;
	}
}

class XQueryAgent extends HTMLElement {
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

interface ChartPayload {
	outline?: string;
	spec?: Record<string, unknown>;
}

class XChartAgent extends HTMLElement {
	#userinput: HTMLTextAreaElement;
	#sqlinput: HTMLTextAreaElement;
	#status: HTMLElement;
	#statusmsg: HTMLElement;
	#specsection: HTMLElement;
	#speceditor: HTMLTextAreaElement;
	#rendersection: HTMLElement;
	#chartresult: HTMLElement;

	constructor() {
		super();
		this.innerHTML = `
			<h1>Chart Agent</h1>
			<section id="chartprompt">
				<div class="label">Message:</div>
				<textarea id="chartuserinput" class="mainarea" placeholder="Describe the chart you want."></textarea>
				<div class="btns">
					<button id="generatesql" type="button">Send to QueryAgent</button>
				</div>
			</section>
			<section>
				<div class="label">SQL:</div>
				<textarea id="chartsqlinput" class="mainarea" placeholder="SQL query for chart data."></textarea>
				<div class="btns">
					<button id="generatechart" type="button">Generate Chart Spec</button>
				</div>
			</section>
			<section id="chartstatus" hidden>
				<div class="label"></div>
				<div id="chartstatusmsg" class="mainarea"></div>
				<div class="btns"></div>
			</section>
			<section id="chartspec" hidden>
				<div class="label">Chart Spec:</div>
				<textarea id="chartspeceditor" class="mainarea"></textarea>
				<div class="btns">
					<button id="renderchart" type="button">Render Chart</button>
				</div>
			</section>
			<section id="chartrender" hidden>
				<div class="label">Chart:</div>
				<div id="chartresult" class="mainarea"></div>
				<div class="btns">
					<button id="closechart" type="button">Close Chart</button>
				</div>
			</section>`;
		this.#userinput = this.querySelector('#chartuserinput') as HTMLTextAreaElement;
		this.#sqlinput = this.querySelector('#chartsqlinput') as HTMLTextAreaElement;
		this.#status = this.querySelector('#chartstatus') as HTMLElement;
		this.#statusmsg = this.querySelector('#chartstatusmsg') as HTMLElement;
		this.#specsection = this.querySelector('#chartspec') as HTMLElement;
		this.#speceditor = this.querySelector('#chartspeceditor') as HTMLTextAreaElement;
		this.#rendersection = this.querySelector('#chartrender') as HTMLElement;
		this.#chartresult = this.querySelector('#chartresult') as HTMLElement;

		(this.querySelector('#generatechart') as HTMLButtonElement).onclick = async () => {
			await this.generate();
		};
		(this.querySelector('#renderchart') as HTMLButtonElement).onclick = async () => {
			await this.renderChart();
		};
		(this.querySelector('#closechart') as HTMLButtonElement).onclick = () => {
			this.closeChart();
		};
	}

	async render() {
		//this.bindEvents();
	}

	async generate() {
		const text = this.#userinput.value.trim();
		const sql = this.#sqlinput.value.trim();
		if (!text || !sql) {
			this.showStatus(`<div class="errmsg">Message and SQL are required.</div>`);
			return;
		}
		this.showStatus(`<em>Generating chart spec...</em>`);
		this.#specsection.hidden = true;
		this.#rendersection.hidden = true;

		try {
			const res = await fetch('/chart/message', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text, sql }),
			});
			if (!res.ok) {
				const txt = await res.text();
				this.showStatus(`<div class="errmsg">${escapeHTML(txt || "Chart generation failed.")}</div>`);
				return;
			}
			const payload = await res.json() as ChartPayload;
			if (!payload.spec) {
				this.showStatus(`<div class="errmsg">No chart spec returned.</div>`);
				return;
			}
			this.#status.hidden = true;
			this.#speceditor.value = JSON.stringify(payload.spec, null, 2);
			this.#specsection.hidden = false;
		} catch (e) {
			this.showStatus(`<div class="errmsg">Chart generation failed.</div>`);
		}
	}

	async renderChart() {
		const specText = this.#speceditor.value.trim();
		if (!specText) {
			this.showStatus(`<div class="errmsg">No spec to render.</div>`);
			return;
		}
		let spec: Record<string, unknown>;
		try {
			spec = JSON.parse(specText);
		} catch (e) {
			this.showStatus(`<div class="errmsg">Invalid JSON in chart spec.</div>`);
			return;
		}

		const sql = this.#sqlinput.value.trim();
		if (!sql) {
			this.showStatus(`<div class="errmsg">No SQL to execute.</div>`);
			return;
		}

		this.showStatus(`<em>Fetching data...</em>`);
		try {
			const res = await fetch('/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sql }),
			});
			if (!res.ok) {
				const txt = await res.text();
				this.showStatus(`<div class="errmsg">${escapeHTML(txt || "Execution failed.")}</div>`);
				return;
			}
			const result = await res.json() as SQLResult;
			const rows = this.buildRows(result);
			const specWithData = { ...spec, data: { values: rows } } as VisualizationSpec;

			this.#status.hidden = true;
			this.#chartresult.innerHTML = "";
			this.#rendersection.hidden = false;

			await vegaEmbed(this.#chartresult, specWithData, { actions: false });
		} catch (e) {
			this.showStatus(`<div class="errmsg">Failed to render chart.</div>`);
		}
	}

	closeChart() {
		this.#rendersection.hidden = true;
		this.#chartresult.innerHTML = "";
	}

	showStatus(html: string) {
		this.#status.hidden = false;
		this.#statusmsg.innerHTML = html;
	}

	buildRows(res: SQLResult): Record<string, unknown>[] {
		const cols = res.column_names ?? [];
		return (res.rows ?? []).map(row =>
			Object.fromEntries(cols.map((col, i) => [col, row[i]]))
		);
	}
}

function escapeHTML(str: string): string {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
}

customElements.define('x-main', XMain);
customElements.define('x-login', XLogin);
customElements.define('x-dataagents', XDataAgents);
customElements.define('x-queryagent', XQueryAgent);
customElements.define('x-chartagent', XChartAgent);
