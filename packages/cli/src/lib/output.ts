import chalk from "chalk";

export function table(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => {
    const maxRow = rows.reduce(
      (max, row) => Math.max(max, (row[i] ?? "").length),
      0
    );
    return Math.max(h.length, maxRow);
  });

  const headerLine = headers
    .map((h, i) => chalk.dim(h.padEnd(colWidths[i] ?? 0)))
    .join("  ");

  const separator = colWidths.map((w) => chalk.dim("-".repeat(w))).join("  ");

  console.log(headerLine);
  console.log(separator);

  for (const row of rows) {
    const line = row
      .map((cell, i) => cell.padEnd(colWidths[i] ?? 0))
      .join("  ");
    console.log(line);
  }
}

export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function success(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

export function error(message: string): void {
  console.error(chalk.red(`✗ ${message}`));
}

export function info(message: string): void {
  console.log(chalk.dim(message));
}

export function keyValue(pairs: [string, string][]): void {
  const maxKey = pairs.reduce((max, [k]) => Math.max(max, k.length), 0);
  for (const [key, value] of pairs) {
    console.log(`  ${chalk.dim(key.padEnd(maxKey))}  ${value}`);
  }
}
