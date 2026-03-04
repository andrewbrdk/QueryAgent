BEGIN;

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS page_views CASCADE;

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    signup_date DATE NOT NULL
);

CREATE TABLE articles (
    article_id SERIAL PRIMARY KEY,
    article_name VARCHAR(100),
    category VARCHAR(50),
    price NUMERIC(10,2),
    cost NUMERIC(10,2),
    created_at DATE
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    order_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('completed','cancelled','pending')),
    total_amount NUMERIC(10,2)
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    article_id INT REFERENCES articles(article_id),
    quantity INT CHECK (quantity > 0),
    unit_price NUMERIC(10,2)
);

CREATE TABLE page_views (                                                                                               
    view_id SERIAL PRIMARY KEY,                                                                                         
    user_id INT REFERENCES users(user_id),                                                                              
    article_id INT REFERENCES articles(article_id),                                                                     
    viewed_at TIMESTAMP,                                                                                                
    duration_seconds INT                                                                                                
);

INSERT INTO users (first_name, last_name, email, signup_date) VALUES
('Alice', 'Smith', 'alice@example.com', '2023-01-15'),
('Bob', 'Müller', 'bob@example.com', '2023-03-22'),
('Carlos', 'Garcia', 'carlos@example.com', '2023-05-10'),
('Yuki', 'Tanaka', 'yuki@example.com', '2023-06-05'),
('Emma', 'Johnson', 'emma@example.com', '2023-07-18');

INSERT INTO articles (article_name, category, price, cost, created_at) VALUES
('Laptop Pro 15', 'Electronics', 1500.00, 1000.00, '2023-01-01'),
('Wireless Mouse', 'Electronics', 40.00, 15.00, '2023-01-10'),
('Office Chair', 'Furniture', 250.00, 120.00, '2023-02-01'),
('Standing Desk', 'Furniture', 600.00, 350.00, '2023-02-15'),
('Noise Cancelling Headphones', 'Electronics', 300.00, 180.00, '2023-03-01');

INSERT INTO orders (user_id, order_date, status, total_amount) VALUES
(1, '2023-08-01', 'completed', 1540.00),
(2, '2023-08-03', 'completed', 250.00),
(3, '2023-08-10', 'completed', 600.00),
(1, '2023-09-05', 'cancelled', 40.00),
(4, '2023-09-12', 'completed', 300.00),
(5, '2023-10-01', 'completed', 1540.00);

INSERT INTO order_items (order_id, article_id, quantity, unit_price) VALUES
(1, 1, 1, 1500.00),
(1, 2, 1, 40.00),
(2, 3, 1, 250.00),
(3, 4, 1, 600.00),
(4, 2, 1, 40.00),
(5, 5, 1, 300.00),
(6, 1, 1, 1500.00),
(6, 2, 1, 40.00);

INSERT INTO page_views (user_id, article_id, viewed_at, duration_seconds) VALUES                                        
(1, 1, '2023-08-01 08:00:00', 120),                                                                                     
(1, 2, '2023-08-01 08:05:00', 45),                                                                                      
(1, 3, '2023-08-01 09:00:00', 90),                                                                                      
(2, 1, '2023-08-02 10:00:00', 200),                                                                                     
(2, 4, '2023-08-02 10:30:00', 60),                                                                                      
(3, 5, '2023-08-03 11:00:00', 150),                                                                                     
(3, 2, '2023-08-03 11:20:00', 30),                                                                                      
(4, 1, '2023-08-04 12:00:00', 180),                                                                                     
(4, 3, '2023-08-04 12:30:00', 75),                                                                                      
(5, 4, '2023-08-05 13:00:00', 110),                                                                                     
(5, 5, '2023-08-05 13:15:00', 95),                                                                                      
(1, 4, '2023-08-06 09:00:00', 130),                                                                                     
(2, 5, '2023-08-06 09:30:00', 85),                                                                                      
(3, 1, '2023-08-07 10:00:00', 210),                                                                                     
(4, 2, '2023-08-07 10:45:00', 55),                                                                                      
(5, 3, '2023-08-08 11:00:00', 140),                                                                                     
(1, 5, '2023-08-08 11:30:00', 70),                                                                                      
(2, 3, '2023-08-09 12:00:00', 160),                                                                                     
(3, 4, '2023-08-09 12:20:00', 50),                                                                                      
(4, 5, '2023-08-10 13:00:00', 100),                                                                                     
(5, 1, '2023-08-10 13:30:00', 220),                                                                                     
(1, 2, '2023-08-11 08:00:00', 40),                                                                                      
(2, 1, '2023-08-11 08:30:00', 190),                                                                                     
(3, 3, '2023-08-12 09:00:00', 80),                                                                                      
(4, 4, '2023-08-12 09:30:00', 115),                                                                                     
(5, 2, '2023-08-13 10:00:00', 35),                                                                                      
(1, 3, '2023-08-13 10:30:00', 105),                                                                                     
(2, 2, '2023-08-14 11:00:00', 65),                                                                                      
(3, 5, '2023-08-14 11:30:00', 175),                                                                                     
(4, 1, '2023-08-15 12:00:00', 230),                                                                                     
(5, 4, '2023-08-15 12:30:00', 90),                                                                                      
(1, 4, '2023-08-16 08:00:00', 125),                                                                                     
(2, 5, '2023-08-16 08:30:00', 145),                                                                                     
(3, 2, '2023-08-17 09:00:00', 55),                                                                                      
(4, 3, '2023-08-17 09:30:00', 170),                                                                                     
(5, 5, '2023-08-18 10:00:00', 80),                                                                                      
(1, 1, '2023-08-18 10:30:00', 200),                                                                                     
(2, 4, '2023-08-19 11:00:00', 60),                                                                                      
(3, 1, '2023-08-19 11:30:00', 215),                                                                                     
(4, 5, '2023-08-20 12:00:00', 95),                                                                                      
(5, 2, '2023-08-20 12:30:00', 45),                                                                                      
(1, 5, '2023-08-21 08:00:00', 135),                                                                                     
(2, 3, '2023-08-21 08:30:00', 155),                                                                                     
(3, 4, '2023-08-22 09:00:00', 70),                                                                                      
(4, 2, '2023-08-22 09:30:00', 110),                                                                                     
(5, 1, '2023-08-23 10:00:00', 240),                                                                                     
(1, 3, '2023-08-23 10:30:00', 85),                                                                                      
(2, 2, '2023-08-24 11:00:00', 50),                                                                                      
(3, 5, '2023-08-24 11:30:00', 165),                                                                                     
(4, 1, '2023-08-25 12:00:00', 195);  

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_article ON order_items(article_id);
CREATE INDEX idx_page_views_user ON page_views(user_id);                                                                
CREATE INDEX idx_page_views_article ON page_views(article_id); 

COMMIT;