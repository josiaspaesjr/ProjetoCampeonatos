import type { AreaCron } from "./cronograma-areas";

/** um bloco de idade·sexo·faixa e a hora em que ele começa */
export interface BlocoHorario {
  /** chave do grupo (classeIdade|sexo|faixa) */
  chave: string;
  /** "Adulto · Masculino · Branca" */
  rotulo: string;
  /** "YYYY-MM-DD" do início */
  data: string;
  /** "30/10" */
  dataLabel: string;
  /** "10:00" */
  hora: string;
  /** tatames em que o bloco corre, na ordem das áreas */
  areas: string[];
}

/**
 * Horário de início por bloco de idade·sexo·faixa.
 *
 * O tempo estimado de cada luta serve para DISTRIBUIR as lutas entre os
 * tatames — ele não é publicado. Uma estimativa por luta erra por muito num
 * evento real (finalização em 30s, luta que vai à decisão, atraso de tatame) e
 * vira reclamação. O que o atleta precisa saber é quando a faixa dele entra, e
 * isso é estável o bastante para valer como promessa.
 *
 * Cada bloco herda o horário da sua categoria mais cedo — se a faixa está
 * espalhada em três tatames, vale o primeiro a começar. O peso não entra: é
 * exatamente a divisão que o atleta reconhece na chamada.
 */
export function blocosPorGrupo(areas: AreaCron[]): BlocoHorario[] {
  const porChave = new Map<string, BlocoHorario>();

  for (const area of areas) {
    for (const cat of area.categorias) {
      const existente = porChave.get(cat.grupoChave);
      if (!existente) {
        porChave.set(cat.grupoChave, {
          chave: cat.grupoChave,
          rotulo: cat.grupoRotulo,
          data: cat.data,
          dataLabel: cat.dataLabel,
          hora: cat.hora,
          areas: [area.nome],
        });
        continue;
      }
      if (!existente.areas.includes(area.nome)) existente.areas.push(area.nome);
      // data e hora são zero-padded, então comparar como texto já ordena
      const antes =
        cat.data < existente.data ||
        (cat.data === existente.data && cat.hora < existente.hora);
      if (antes) {
        existente.data = cat.data;
        existente.dataLabel = cat.dataLabel;
        existente.hora = cat.hora;
      }
    }
  }

  return [...porChave.values()].sort(
    (a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora),
  );
}
