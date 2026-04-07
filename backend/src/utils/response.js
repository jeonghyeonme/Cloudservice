const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Credentials": true,
};