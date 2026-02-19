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

export const HTML_SANITIZATION_CASES = [
  {
    input: '<script>alert("XSS")</script>',
    shouldContain: [],
    shouldNotContain: ['<script>', 'alert'],
  },
  {
    input: '<p>Hello</p><script>alert(1)</script>',
    shouldContain: ['<p>', 'Hello'],
    shouldNotContain: ['<script>'],
  },
  {
    input: '<a href="javascript:alert(1)">Click</a>', // NOSONAR
    shouldContain: ['<a', '>Click</a>'],
    shouldNotContain: ['javascript:'], // NOSONAR
  },
  {
    input: '<img src=x onerror="alert(1)">',
    shouldContain: ['<img'],
    shouldNotContain: ['onerror'],
  },
  {
    input: '<div onclick="alert(1)">Click</div>',
    shouldContain: ['<div>', 'Click'],
    shouldNotContain: ['onclick'],
  },
  {
    input: '<style>body{color:red}</style>',
    shouldContain: [],
    shouldNotContain: ['<style>'],
  },
  {
    input: '<iframe src="evil.com"></iframe>',
    shouldContain: [],
    shouldNotContain: ['<iframe'],
  },
  {
    input: '<object data="evil.swf"></object>',
    shouldContain: [],
    shouldNotContain: ['<object'],
  },
  {
    input: '<embed src="evil.swf">',
    shouldContain: [],
    shouldNotContain: ['<embed'],
  },
];

export const URL_SANITIZATION_CASES = [
  { input: 'javascript:alert(1)', expected: '' }, // NOSONAR
  { input: 'javascript://alert(1)', expected: '' }, // NOSONAR
  { input: 'data:text/html,<script>alert(1)</script>', expected: '' }, // NOSONAR
  { input: 'vbscript:msgbox(1)', expected: '' }, // NOSONAR
  { input: 'https://example.com', expected: 'https://example.com' },
  { input: 'http://example.com', expected: 'http://example.com' }, // NOSONAR
  { input: '/relative/path', expected: '/relative/path' },
  { input: '#anchor', expected: '#anchor' },
  { input: 'mailto:test@example.com', expected: 'mailto:test@example.com' },
];

export const FILENAME_SANITIZATION_CASES = [
  { input: '../../../etc/passwd', shouldNotContain: ['..', '/'] },
  { input: String.raw`..\windows\system32\config\sam`, shouldNotContain: ['..', '\\'] },
  { input: 'file.txt<script>alert(1)</script>', shouldNotContain: ['<script>'] },
  { input: 'normal-file.txt', shouldContain: ['normal-file.txt'] },
  { input: 'file with spaces.txt', shouldContain: ['file with spaces.txt'] },
];

export const CSS_SANITIZATION_CASES = [
  { input: 'color: red; behavior: url(#default#VML)', shouldNotContain: ['behavior'] },
  { input: 'background: url(javascript:alert(1))', shouldNotContain: ['javascript:'] }, // NOSONAR
  { input: 'color: red; -moz-binding: url(xss.xml)', shouldNotContain: ['-moz-binding'] },
  { input: 'color: red; expression(alert(1))', shouldNotContain: ['expression'] }, // NOSONAR
  { input: 'color: red;', shouldContain: ['color: red'] },
];

export const EXPECTED_CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https://*.supabase.co', 'https://api.mistral.ai'],
  'media-src': ["'self'", 'blob:', 'data:'],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'manifest-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
};

export const FORBIDDEN_CSP_VALUES = [
  "'*'", // Wildcard allows anything
  "'unsafe-eval'", // Allows eval() - high XSS risk
  // NOSONAR - test data for security validation
  String.raw`http:`,
  // NOSONAR - test data for security validation
  String.raw`http://*`,
];
