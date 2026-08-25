function formatMoney(amount) {
  return `KSh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
}

module.exports = { formatMoney, formatDate };
