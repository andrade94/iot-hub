import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Format a date for display in the Operations interface
 */
export const formatOperationDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    return `Hoy, ${format(dateObj, 'HH:mm', { locale: es })}`;
  }
  
  if (isTomorrow(dateObj)) {
    return `Mañana, ${format(dateObj, 'HH:mm', { locale: es })}`;
  }
  
  if (isYesterday(dateObj)) {
    return `Ayer, ${format(dateObj, 'HH:mm', { locale: es })}`;
  }
  
  return format(dateObj, 'dd/MM/yyyy', { locale: es });
};

/**
 * Format a date for display in tables (short format)
 */
export const formatTableDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: es });
};

/**
 * Format a date with time for detailed views
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: es });
};

/**
 * Format a relative date (e.g., "hace 2 horas", "en 3 días")
 */
export const formatRelativeDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { locale: es, addSuffix: true });
};

/**
 * Format a delivery date with status context
 */
export const formatDeliveryDate = (date: string | Date, status?: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const baseDate = formatOperationDate(dateObj);
  
  // Add context based on status
  if (status === 'completed' || status === 'delivered') {
    return baseDate;
  }
  
  // For pending/future deliveries, show relative time
  const now = new Date();
  if (dateObj > now) {
    const relative = formatRelativeDate(dateObj);
    return `${baseDate} (${relative})`;
  }
  
  // For overdue deliveries
  if (dateObj < now && (status === 'pending' || status === 'confirmed' || status === 'in_transit')) {
    const relative = formatRelativeDate(dateObj);
    return `${baseDate} (Vencido ${relative})`;
  }
  
  return baseDate;
};

/**
 * Format date for activity logs
 */
export const formatActivityDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    return `Hoy a las ${format(dateObj, 'HH:mm', { locale: es })}`;
  }
  
  if (isYesterday(dateObj)) {
    return `Ayer a las ${format(dateObj, 'HH:mm', { locale: es })}`;
  }
  
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: es });
};