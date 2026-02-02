-- Seed users
INSERT INTO users (id, wallet_address, username, world_id_verified, xp, level) VALUES
('00000000-0000-0000-0000-000000000001', '0x0000000000000000000000000000000000000000', 'DevUser', true, 250, 3);

-- Seed ads
INSERT INTO ads (title, description, type, content_text, xp_reward, wld_reward, duration_seconds) VALUES
('World App Launch', 'Discover the future of identity verification.', 'text', 'World App is revolutionizing digital identity. With World ID, you can prove you are a unique human without revealing personal information.', 50, 0.1, 15),
('Crypto Security Tips', 'Essential tips to keep your crypto safe.', 'text', 'Protect your crypto: Never share your seed phrase. Use hardware wallets. Enable 2FA. Verify URLs before connecting.', 50, 0.1, 20);

-- Seed activities
INSERT INTO activities (title, description, type, code, xp_reward, wld_reward) VALUES
('Promo Code Entry', 'Enter the promo code from the event.', 'code_entry', 'WORLD2025', 100, 0.5);

INSERT INTO activities (title, description, type, questions, xp_reward, wld_reward) VALUES
('Blockchain Basics', 'Test your blockchain knowledge.', 'knowledge_quiz',
'[{"id":"q1","question":"What is a blockchain?","options":["A type of database","A programming language","An operating system","A web browser"],"correct_index":0},{"id":"q2","question":"What consensus does Ethereum use?","options":["Proof of Work","Proof of Stake","Proof of Authority","Proof of Space"],"correct_index":1}]',
150, 0.3);
