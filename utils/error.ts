export const formatErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return "A apărut o eroare necunoscută.";
};
