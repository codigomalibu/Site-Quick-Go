export const drinks = Object.freeze({
  negroni: { name: 'Negroni', category: 'classicos', profile: 'Intenso. Marcante.', image: 'negroni', description: 'Um clássico de presença e personalidade para quem prefere sabores mais intensos. Uma escolha para os brindes que pedem tempo e conversa.' },
  capadocia: { name: 'Capadócia', category: 'tropicais', profile: 'Leve. Tropical.', image: 'capadocia', description: 'Um dos sabores leves e tropicais da carta Quick GO. Uma boa forma de começar a seleção de um encontro descontraído.' },
  zuma: { name: 'Zuma', category: 'tropicais', profile: 'Refrescante. Vibrante.', image: 'zuma', description: 'Cor que chama para o brinde e um perfil leve e refrescante. Para uma carta que também entra no clima da festa.' },
  fitzgerald: { name: 'Fitzgerald', category: 'classicos', profile: 'Clássico. Cítrico.', image: 'fitzgerald', description: 'Parte da seleção de clássicos cítricos da Quick GO. Equilíbrio e personalidade para acompanhar boas conversas.' },
  'moscow-mule': { name: 'Moscow Mule', category: 'classicos', profile: 'Leve. Refrescante.', image: 'moscow-mule', description: 'Um dos mules refrescantes da carta. Uma possibilidade para equilibrar a seleção entre receitas mais leves e sabores marcantes.' },
  tropical: { name: 'Tropical', category: 'sem-alcool', profile: 'Frutado. Sem álcool.', image: 'tropical', description: 'Uma opção sem álcool da carta Quick GO, com perfil leve e tropical. Porque a experiência do brinde também é para quem escolhe não beber álcool.' },
  hileia: { name: 'Hileia', category: 'sem-alcool', profile: 'Leve. Sem álcool.', image: 'hileia', description: 'Cor e presença em uma opção sem álcool. Uma alternativa da carta para deixar o encontro mais completo e incluir diferentes preferências.' },
});

export const categoryNames = { classicos: 'OS CLÁSSICOS', tropicais: 'TROPICAIS & LEVES', 'sem-alcool': 'SEM ÁLCOOL' };

export function validFavorites(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && Object.hasOwn(drinks, id)))].slice(0, 7) : [];
}

export function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'A definir';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function buildBrief(values, favorites = []) {
  const clean = value => String(value || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 1000);
  const guestCount = Number(values.guests);
  if (!Number.isInteger(guestCount) || guestCount < 5 || guestCount > 10000) throw new Error('Informe entre 5 e 10.000 convidados.');
  if (!clean(values.name) || !clean(values.event) || !clean(values.city)) throw new Error('Complete os dados do seu evento.');
  const lines = [
    'MEU EVENTO · QUICK GO BELO HORIZONTE', '',
    `Nome: ${clean(values.name)}`,
    `Ocasião: ${clean(values.event)}`,
    `Data: ${values.dateFlexible ? 'A definir' : formatDate(values.date)}`,
    `Convidados: ${guestCount}`,
    `Cidade: ${clean(values.city)}`,
    `Duração: ${clean(values.duration) || 'A definir'}`,
    `Carta: ${clean(values.menu) || 'Vamos escolher juntos'}`,
  ];
  const chosen = validFavorites(favorites);
  if (chosen.length) lines.push(`Drinks que gostei: ${chosen.map(id => drinks[id].name).join(', ')}`);
  if (clean(values.message)) lines.push(`Minha ideia: ${clean(values.message)}`);
  lines.push('', 'Gostaria de consultar disponibilidade e receber uma proposta.');
  return lines.join('\n');
}

export function contactUrl(number, brief, fallback) {
  if (typeof number === 'string' && /^55\d{10,11}$/.test(number)) return `https://wa.me/${number}?text=${encodeURIComponent(brief)}`;
  return fallback;
}
