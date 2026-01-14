window.SideAiMarkdown = (() => {
  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeUrl(value) {
    if (!value) {
      return "";
    }
    if (!/^https?:\/\//i.test(value)) {
      return "";
    }
    return value.replace(/\"/g, "%22");
  }

  function renderInline(text) {
    const codeBlocks = [];
    const linkBlocks = [];

    let working = text || "";

    working = working.replace(/`([^`]+)`/g, (_match, code) => {
      const id = codeBlocks.length;
      codeBlocks.push(code || "");
      return `@@INLINE_CODE_${id}@@`;
    });

    working = working.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
      const id = linkBlocks.length;
      linkBlocks.push({ label: label || "", url: url || "" });
      return `@@INLINE_LINK_${id}@@`;
    });

    let html = escapeHtml(working);
    html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(^|\s)\*([^*]+)\*/g, "$1<em>$2</em>");

    linkBlocks.forEach((link, index) => {
      const safeLabel = escapeHtml(link.label);
      const safeUrl = sanitizeUrl(link.url);
      const replacement = safeUrl
        ? `<a href="${safeUrl}" target="_blank" rel="noreferrer">${safeLabel}</a>`
        : safeLabel;
      html = html.replace(`@@INLINE_LINK_${index}@@`, replacement);
    });

    codeBlocks.forEach((code, index) => {
      html = html.replace(
        `@@INLINE_CODE_${index}@@`,
        `<code class="inline-code">${escapeHtml(code)}</code>`
      );
    });

    return html;
  }

  function renderMarkdown(content) {
    const blocks = [];
    let text = content || "";

    text = text.replace(/```([\w-]+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
      const id = blocks.length;
      blocks.push({ type: "code", lang: lang || "", content: code || "" });
      return `@@BLOCK_${id}@@`;
    });

    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex) => {
      const id = blocks.length;
      blocks.push({ type: "latex", lang: "LaTeX", content: latex || "" });
      return `@@BLOCK_${id}@@`;
    });

    const lines = text.split(/\r?\n/);
    const output = [];
    let listType = null;
    let inBlockquote = false;

    function closeList() {
      if (listType) {
        output.push(`</${listType}>`);
        listType = null;
      }
    }

    function closeBlockquote() {
      if (inBlockquote) {
        output.push("</blockquote>");
        inBlockquote = false;
      }
    }

    function isTableSeparator(line) {
      return /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(line);
    }

    function parseTableRow(line) {
      const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
      return trimmed.split("|").map((cell) => cell.trim());
    }

    function renderTable(headerLine, separatorLine, bodyLines) {
      const headerCells = parseTableRow(headerLine);
      const alignTokens = parseTableRow(separatorLine);
      const alignments = alignTokens.map((token) => {
        const trimmed = token.trim();
        if (trimmed.startsWith(":") && trimmed.endsWith(":")) {
          return "center";
        }
        if (trimmed.startsWith(":")) {
          return "left";
        }
        if (trimmed.endsWith(":")) {
          return "right";
        }
        return "left";
      });

      const rows = bodyLines.map((line) => parseTableRow(line));

      const head = headerCells
        .map((cell, index) => {
          const align = alignments[index] || "left";
          return `<th style="text-align:${align}">${renderInline(cell)}</th>`;
        })
        .join("");

      const body = rows
        .map((cells) => {
          const tds = cells
            .map((cell, index) => {
              const align = alignments[index] || "left";
              return `<td style="text-align:${align}">${renderInline(cell)}</td>`;
            })
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");

      return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("@@BLOCK_")) {
        closeList();
        closeBlockquote();
        output.push(trimmed);
        continue;
      }

      if (trimmed && trimmed.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        const header = lines[i];
        const separator = lines[i + 1];
        const body = [];
        i += 2;
        while (i < lines.length && lines[i].trim().includes("|")) {
          body.push(lines[i]);
          i += 1;
        }
        i -= 1;
        closeList();
        closeBlockquote();
        output.push(renderTable(header, separator, body));
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        closeList();
        closeBlockquote();
        const level = headingMatch[1].length;
        output.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
        continue;
      }

      if (/^\s*([-*_]){3,}\s*$/.test(trimmed)) {
        closeList();
        closeBlockquote();
        output.push("<hr>");
        continue;
      }

      const blockquoteMatch = line.match(/^\s*>\s?(.*)$/);
      if (blockquoteMatch) {
        if (!inBlockquote) {
          closeList();
          output.push("<blockquote>");
          inBlockquote = true;
        }
        output.push(`<p>${renderInline(blockquoteMatch[1])}</p>`);
        continue;
      }

      const unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/);
      const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);

      if (unorderedMatch || orderedMatch) {
        const type = orderedMatch ? "ol" : "ul";
        if (listType !== type) {
          closeList();
          closeBlockquote();
          listType = type;
          output.push(`<${type}>`);
        }
        const itemText = orderedMatch ? orderedMatch[1] : unorderedMatch[1];
        output.push(`<li>${renderInline(itemText)}</li>`);
        continue;
      }

      if (!trimmed) {
        closeList();
        closeBlockquote();
        output.push("<br>");
        continue;
      }

      closeList();
      closeBlockquote();
      output.push(`<p>${renderInline(line)}</p>`);
    }

    closeList();
    closeBlockquote();

    let html = output.join("");

    blocks.forEach((block, index) => {
      const safeContent = escapeHtml(block.content);
      const encoded = encodeURIComponent(block.content || "");
      const label = block.type === "latex" ? "LaTeX" : block.lang || "Code";
      const blockHtml = `
        <div class="${block.type}-block">
          <div class="code-header">
            <span class="code-lang">${label}</span>
            <button class="copy-button" data-copy="${encoded}" type="button">Copy</button>
          </div>
          <pre><code>${safeContent}</code></pre>
        </div>
      `;
      html = html.replace(`@@BLOCK_${index}@@`, blockHtml);
    });

    return html;
  }

  function attachCopyHandlers(container) {
    container.querySelectorAll(".copy-button").forEach((button) => {
      button.addEventListener("click", async () => {
        const raw = button.dataset.copy || "";
        const text = decodeURIComponent(raw);
        await navigator.clipboard.writeText(text);
        const original = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = original;
        }, 1200);
      });
    });
  }

  return {
    renderMarkdown,
    attachCopyHandlers,
  };
})();
