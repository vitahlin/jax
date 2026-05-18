export function queryToRecord(searchParams: URLSearchParams): Record<string, string> {
  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}

export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (value === "1" || value.toLowerCase() === "true") {
    return true;
  }

  if (value === "0" || value.toLowerCase() === "false") {
    return false;
  }

  return undefined;
}

export function splitCsv(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function pickOptions(
  query: Record<string, string>,
  knownKeys: readonly string[]
): Record<string, string> | undefined {
  const known = new Set(knownKeys);
  const options: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    if (!known.has(key)) {
      options[key] = value;
    }
  }

  return Object.keys(options).length > 0 ? options : undefined;
}
