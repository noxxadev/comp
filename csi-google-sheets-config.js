/**
 * Public browser configuration for the CSI page.
 * CSI Web App deployment URL only. Never store Spreadsheet IDs or credentials here.
 */
window.CompCsiConfig = {
  // CSI requests are routed through the same-origin Vercel API proxy.
  apiUrl: '/api/csi'
};
