import WordExtractor from "word-extractor";
import { SaxesParser } from "saxes";
import { officeXmlEntries, validateAttachment } from "./files.ts";

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const paragraphs = (text: string) => text.split(/\n+/).filter(Boolean).map(line => `<p>${escape(line)}</p>`).join("");

/** Output contains only escaped document text; no active content, remote assets or Office execution. */
export async function documentPreview(bytes: Uint8Array, name: string) {
  validateAttachment(bytes, name);
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "doc" || ext === "docx") {
    const document = await new WordExtractor().extract(Buffer.from(bytes));
    const text = [document.getBody(), document.getFootnotes()].filter(Boolean).join("\n\n");
    if (!text.trim()) throw new Error("No se encontró texto para la vista de lectura.");
    return { html: paragraphs(text.slice(0, 100000)), note: "Vista de lectura del texto de Word. El diseño, las imágenes y los objetos del original pueden variar." + (text.length > 100000 ? " Se muestran los primeros 100.000 caracteres." : "") };
  }
  if (ext !== "xlsx" && ext !== "pptx") throw new Error("Este formato no tiene vista de lectura.");
  const zip = officeXmlEntries(bytes, ext);
  const readTexts = (xml: string, block: string) => {
    const parser = new SaxesParser({ xmlns: true });
    const values: string[] = []; let text = "", capture = false;
    parser.on("opentag", tag => { if (tag.local === block) text = ""; if (tag.local === "t") capture = true; });
    parser.on("text", value => { if (capture) text += value; });
    parser.on("closetag", tag => { if (tag.local === "t") capture = false; if (tag.local === block) values.push(text); });
    parser.write(xml).close(); return values;
  };
  if (ext === "pptx") {
    const slides = zip.names.filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((a,b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
    const html = slides.slice(0,50).map((path,index) => `<h3>Diapositiva ${index+1}</h3>${paragraphs(readTexts(zip.readXml(path), "p").join("\n"))}`).join("");
    return { html, note: "Vista de lectura del texto de hasta 50 diapositivas. El diseño y las imágenes se conservan en el archivo original." };
  }
  const strings = zip.names.includes("xl/sharedStrings.xml") ? readTexts(zip.readXml("xl/sharedStrings.xml"), "si") : [];
  const sheets = zip.names.filter(path => /^xl\/worksheets\/sheet\d+\.xml$/.test(path)).sort((a,b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  let html = "";
  for (const [index,path] of sheets.slice(0,10).entries()) {
    const parser = new SaxesParser({xmlns:true});
    const rows: string[] = []; let cells: string[] = [], value = "", type = "", capture = false, rowCount = 0, column = 0;
    parser.on("opentag", tag => {
      if (tag.local === "row") { cells = []; rowCount++; }
      if (tag.local === "c") {
        value = ""; const attribute = tag.attributes.t; type = typeof attribute === "object" ? attribute.value : "";
        const reference = tag.attributes.r; const letters = typeof reference === "object" ? reference.value.replace(/[0-9]/g, "") : "";
        column = [...letters].reduce((total,letter) => total*26+letter.charCodeAt(0)-64,0)-1;
        if(column<0) column=cells.length;
      }
      if (tag.local === "v" || tag.local === "t") capture = true;
    });
    parser.on("text", text => { if (capture) value += text; });
    parser.on("closetag", tag => {
      if (tag.local === "v" || tag.local === "t") capture = false;
      if (tag.local === "c" && column < 50) {
        while(cells.length<column) cells.push("<td></td>");
        cells[column]=`<td>${escape(type === "s" ? strings[Number(value)] ?? "" : value)}</td>`;
      }
      if (tag.local === "row" && rowCount <= 1000) rows.push(`<tr>${cells.join("")}</tr>`);
    });
    parser.write(zip.readXml(path)).close();
    html += `<h3>Hoja ${index+1}</h3><table><tbody>${rows.join("")}</tbody></table>`;
    if (html.length > 500000) break;
  }
  return {html, note:"Vista de lectura de los valores guardados: hasta 10 hojas, 1.000 filas y 50 celdas por fila. No se recalculan fórmulas ni se muestran gráficos."};
}
