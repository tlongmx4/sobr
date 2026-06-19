// Shared bcrypt work factor for every password hash in the app. Raised from the
// historical 10 to 12 (OWASP-recommended floor). `bcrypt.compare` reads the cost
// from each stored hash, so existing cost-10 hashes keep verifying and upgrade to
// 12 naturally the next time the user sets a password.
export const BCRYPT_ROUNDS = 12;

// A real bcrypt hash of a throwaway string. Used to run a comparison even when no
// account matches the submitted email, so login response time doesn't reveal
// whether the email exists (timing-based account enumeration). Never matches any
// real password.
export const DUMMY_PASSWORD_HASH =
  "$2b$12$v6p2bd2mOeTuaTt.rKNFS.rXBFi1icMpWa7hH02lkwqfATz2mt3w6";
