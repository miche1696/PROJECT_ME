const headingRegex = /^(#{1,6})\s+(.*)$/;
const listRegex = /^[-*]\s+(.*)$/;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function inlineMarkdownToHtml(text: string): string {
  let output = escapeHtml(text);
  output = output.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*(.+?)\*/g, "<em>$1</em>");
  output = output.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  return output;
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push("<p></p>");
      continue;
    }

    const headingMatch = line.match(headingRegex);
    if (headingMatch) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineMarkdownToHtml(headingMatch[2])}</h${level}>`);
      continue;
    }

    const listMatch = line.match(listRegex);
    if (listMatch) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdownToHtml(listMatch[1])}</li>`);
      continue;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    html.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
  }

  if (inList) {
    html.push("</ul>");
  }

  return html.join("\n");
}

export function htmlToMarkdown(html: string): string {
  let output = html;

  output = output.replace(/<h(\d)>(.*?)<\/h\1>/g, (_match, level, text) => {
    const hashes = "#".repeat(Number(level));
    return `${hashes} ${text}`;
  });

  output = output.replace(/<ul>([\s\S]*?)<\/ul>/g, (_match, listBody) => {
    const items = listBody
      .split(/<\/li>/)
      .map((item) => item.replace(/<li>/, "").trim())
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join("\n");
    return items;
  });

  output = output.replace(/<strong>(.*?)<\/strong>/g, "**$1**");
  output = output.replace(/<em>(.*?)<\/em>/g, "*$1*");
  output = output.replace(/<a href=\"(.*?)\">(.*?)<\/a>/g, "[$2]($1)");
  output = output.replace(/<p>(.*?)<\/p>/g, (_match, text) => text || "");
  output = output.replace(/<br\s*\/>/g, "\n");
  output = output.replace(/<[^>]+>/g, "");

  return output
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
