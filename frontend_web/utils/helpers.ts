
/**
 * Utilitaires transverses pour Dabali Express
 * Centralisation des fonctions de formatage et de calcul
 */

/**
 * Génère les initiales d'un nom (ex: "Issa Ouédraogo" -> "IO")
 */
export const getInitials = (name: string): string => {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Formate un montant en FCFA avec séparateur de milliers
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

/**
 * Simule un délai réseau réaliste (entre min et max ms)
 */
export const simulateNetworkDelay = (min = 400, max = 1200): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, delay));
};
