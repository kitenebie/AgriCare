export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getAvatarColor = (name: string): string => {
  const colors = ['#1B5E20', '#2E7D32', '#388E3C', '#43A047', '#4CAF50'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'upcoming':
      return '#2E7D32';
    case 'pending':
      return '#FF9800';
    case 'completed':
      return '#4CAF50';
    case 'cancelled':
      return '#D32F2F';
    default:
      return '#666666';
  }
};
