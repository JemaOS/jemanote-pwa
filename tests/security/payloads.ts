export const WEAK_PASSWORDS = [
  '123456', // NOSONAR
  'password', // NOSONAR
  'qwerty', // NOSONAR
  'abc123', // NOSONAR
  'letmein', // NOSONAR
  'welcome', // NOSONAR
  'monkey', // NOSONAR
  '1234567890', // NOSONAR
  'password123', // NOSONAR
  'admin', // NOSONAR
  'root', // NOSONAR
  'toor', // NOSONAR
  '1234', // NOSONAR
  '111111', // NOSONAR
  'master', // NOSONAR
  'sunshine', // NOSONAR
  'princess', // NOSONAR
  'football', // NOSONAR
  'baseball', // NOSONAR
  'iloveyou', // NOSONAR
];

export const STRONG_PASSWORDS = [
  'MyStr0ng!P@ssw0rd',
  'C0mpl3xP@ss#2024',
  'S3cur3!P@ssw0rd$',
  'Tr0ub4dor&3xtra',
  'xK9#mP2$vL7@nQ4',
];

export const AUTH_BYPASS_PAYLOADS = [
  { email: "admin' OR '1'='1", password: 'anything' }, // NOSONAR
  { email: 'admin@example.com', password: "' OR '1'='1" }, // NOSONAR
  { email: "admin'--", password: 'anything' }, // NOSONAR
  { email: "admin'/*", password: 'anything' }, // NOSONAR
  { email: 'admin@example.com', password: 'password', otp: '000000' }, // NOSONAR
  { email: 'admin@example.com', password: 'password', otp: '123456' }, // NOSONAR
];

export const SQL_INJECTION_PAYLOADS = [
  // Classic SQL injection
  "' OR '1'='1",
  "' OR '1'='1' --",
  "' OR '1'='1' /*",
  "' OR 1=1 --",
  "' OR 1=1 #",
  "' OR 1=1; DROP TABLE users --",

  // Union-based
  "' UNION SELECT * FROM users --", // NOSONAR
  "' UNION SELECT null, username, password FROM users --", // NOSONAR

  // Time-based blind
  "' OR SLEEP(5) --",
  "' OR pg_sleep(5) --",
  "' OR WAITFOR DELAY '0:0:5' --",

  // Error-based
  "' AND 1=CONVERT(int, (SELECT @@version)) --",

  // Stacked queries
  "'; DROP TABLE notes; --",
  "'; DELETE FROM users; --",

  // Boolean-based blind
  "' AND 1=1 --",
  "' AND 1=2 --",

  // Comment variations
  "'--",
  "'/*",
  "' #",
  "';--",
];

export const NOSQL_INJECTION_PAYLOADS = [
  // MongoDB injection
  '{"$gt": ""}',
  '{"$ne": null}',
  '{"$regex": ".*"}',
  '{"$where": "this.password.length > 0"}',
  '{"$or": [{"username": "admin"}, {"username": {"$ne": null}}]}',

  // JavaScript injection in MongoDB
  '{$where: function() { return true }}',
  'true, $where: "sleep(5000)"',

  // Array injection
  '{"username": {"$in": ["admin", "user"]}}',
  '{"id": {"$nin": []}}',
];

export const COMMAND_INJECTION_PAYLOADS = [
  '; cat /etc/passwd',
  '| cat /etc/passwd',
  '&& cat /etc/passwd',
  '|| cat /etc/passwd',
  '`cat /etc/passwd`',
  '$(cat /etc/passwd)',
  '; rm -rf /',
  '| whoami',
  '&& dir',
];

export const LDAP_INJECTION_PAYLOADS = [
  '*)(uid=*))(&(uid=*',
  '*)(|(mail=*))',
  '*)(uid=*))(&(uid=*',
  'admin)(&))',
  '*)(uid=*))(&(uid=*',
];

export const XPATH_INJECTION_PAYLOADS = [
  "' or '1'='1",
  "' or '1'='1' or '1'='1",
  "' or ''='",
  "' or 1=1 or ''='",
  "' or 'a'='a",
];
