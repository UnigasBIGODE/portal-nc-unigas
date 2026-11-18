import type { NC } from './types';
import { fmtData } from './utils';

/** Linhas no mesmo formato da aba "NC" da planilha original. */
function linhas(itens: NC[], rotulos?: string[]) {
  return itens.map((n) => ({
    'NC ID': n.nc_id,
    'Área': n.area,
    'Título': n.titulo,
    'Descrição': n.descricao ?? n.descricao_resumo ?? '',
    'Plano de Ação': n.plano_acao ?? '',
    Criticidade: n.criticidade ?? '',
    'Rótulo criticidade': n.criticidade !== null && rotulos ? rotulos[n.criticidade] ?? '' : '',
    'Resp. Resolução': n.resp_resolucao,
    Verificador: n.verificador,
    'Gerência': n.gerencia,
    'Data Cadastro': fmtData(n.data_cadastro),
    Prazo: fmtData(n.prazo),
    'Data da Execução': n.data_execucao ? fmtData(n.data_execucao) : '',
    Etapa: n.etapa,
    'Status de prazo': n.status_prazo,
    'Dias de atraso': n.dias_atraso,
    'Região': n.regiao,
  }));
}

function nomeArquivo(base: string, ext: string) {
  const d = new Date();
  const s = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${base}_${s}.${ext}`;
}

export async function exportarExcel(itens: NC[], base = 'NCs_Unigas', rotulos?: string[]) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(linhas(itens, rotulos));
  ws['!cols'] = [8, 16, 40, 60, 50, 10, 14, 16, 20, 22, 12, 12, 14, 14, 14, 10, 10].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'NC');
  XLSX.writeFile(wb, nomeArquivo(base, 'xlsx'));
}

export async function exportarTabelaExcel(dados: Record<string, unknown>[], base: string, aba = 'Dados') {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dados), aba);
  XLSX.writeFile(wb, nomeArquivo(base, 'xlsx'));
}

export async function exportarPDF(itens: NC[], titulo: string, subtitulo = '') {
  const [{ jsPDF }, autoTable] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFillColor(11, 11, 13);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 56, 'F');
  doc.setTextColor(227, 6, 19);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(20);
  doc.text('Unigás', 32, 36);
  doc.setTextColor(245, 245, 247);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(titulo, 112, 35);
  doc.setTextColor(90, 90, 100);
  doc.setFontSize(9);
  doc.text(`${subtitulo}${subtitulo ? ' · ' : ''}${itens.length} NC(s) · gerado em ${new Date().toLocaleString('pt-BR')}`, 32, 74);
  autoTable.default(doc, {
    startY: 84,
    head: [['NC ID', 'Área', 'Título', 'Crit.', 'Verificador', 'Gerência', 'Cadastro', 'Prazo', 'Execução', 'Etapa', 'Status', 'Atraso']],
    body: itens.map((n) => [
      n.nc_id,
      n.area,
      n.titulo.slice(0, 60),
      n.criticidade ?? '',
      n.verificador,
      n.gerencia,
      fmtData(n.data_cadastro),
      fmtData(n.prazo),
      n.data_execucao ? fmtData(n.data_execucao) : '',
      n.etapa,
      n.status_prazo,
      n.dias_atraso ? `${n.dias_atraso} d` : '',
    ]),
    styles: { fontSize: 7.5, cellPadding: 4 },
    headStyles: { fillColor: [28, 28, 33], textColor: [245, 245, 247] },
    alternateRowStyles: { fillColor: [246, 246, 248] },
    columnStyles: { 2: { cellWidth: 170 } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 10 && (d.cell.raw === 'Atrasado' || d.cell.raw === 'Fora do prazo')) {
        d.cell.styles.textColor = [220, 38, 38];
        d.cell.styles.fontStyle = 'bold';
      }
    },
  });
  doc.save(nomeArquivo('NCs_Unigas', 'pdf'));
}
