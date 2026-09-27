export const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Not available');
export const fmtPrice = (n) => (n === null || n === undefined ? 'Not available' : `₹${n.toLocaleString('en-IN')}`);
