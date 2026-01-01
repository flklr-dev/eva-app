import { getApiBaseUrl } from '../utils/apiConfig';

export interface SendSOSParams {
  latitude: number;
  longitude: number;
  message?: string;
}

export interface SOSAlert {
  id: string;
  status: 'active' | 'resolved' | 'cancelled';
  sentAt: Date;
  recipientsCount: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  message?: string;
}

export interface SendSOSResponse {
  message: string;
  alert: {
    id: string;
    status: string;
    sentAt: Date;
    recipientsCount: number;
  };
}

/**
 * Send an SOS alert
 */
export const sendSOS = async (
  token: string,
  params: SendSOSParams
): Promise<SendSOSResponse> => {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/sos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to send SOS alert' }));
      throw new Error(errorData.message || 'Failed to send SOS alert');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[SOS] Error sending SOS alert:', error);
    throw error;
  }
};

/**
 * Get active SOS alerts sent by the user
 */
export const getMySOSAlerts = async (token: string): Promise<{ alerts: SOSAlert[] }> => {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/sos/my`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch SOS alerts' }));
      throw new Error(errorData.message || 'Failed to fetch SOS alerts');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[SOS] Error fetching SOS alerts:', error);
    throw error;
  }
};

/**
 * Cancel an SOS alert
 */
export const cancelSOS = async (token: string, alertId: string): Promise<void> => {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/sos/${alertId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to cancel SOS alert' }));
      throw new Error(errorData.message || 'Failed to cancel SOS alert');
    }
  } catch (error: any) {
    console.error('[SOS] Error cancelling SOS alert:', error);
    throw error;
  }
};


