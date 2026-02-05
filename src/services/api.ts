import axios from 'axios';
import { Session, Account, App, KeySet, UsageData } from '../types';

const API_BASE = '/api';

interface LoginResponse {
  session: Session;
  accounts: Account[];
}

interface AppsResponse {
  result: App[];
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await axios.get(`${API_BASE}/login`, {
    params: { username, password },
  });
  return response.data;
}

export async function searchAccounts(email: string, token: string): Promise<Account[]> {
  const response = await axios.get(`${API_BASE}/search-accounts`, {
    params: { email, token },
  });
  // The backend now returns actual account objects (not users)
  const accounts = response.data.users || response.data;
  if (Array.isArray(accounts)) {
    return accounts.filter(Boolean);
  }
  return [];
}

export async function getApps(ownerId: number, token: string): Promise<AppsResponse> {
  const response = await axios.get(`${API_BASE}/apps`, {
    params: { ownerid: ownerId, token },
  });
  
  // Internal admin API returns {result: Array, total: number}
  if (response.data.result && Array.isArray(response.data.result)) {
    return { result: response.data.result };
  }
  
  // Fallback for other response formats
  const apps = response.data.apps || response.data;
  return { result: Array.isArray(apps) ? apps : [] };
}

export async function getKeys(appId: number, token: string): Promise<KeySet[]> {
  const response = await axios.get(`${API_BASE}/keys`, {
    params: { appid: appId, token },
  });
  return response.data;
}

interface GetUsageParams {
  token: string;
  accountId?: number;
  appId?: number;
  keyId?: number;
  start?: string;
  end?: string;
}

export async function getUsage(params: GetUsageParams): Promise<UsageData> {
  const response = await axios.get(`${API_BASE}/key-usage`, {
    params: {
      token: params.token,
      accountid: params.accountId,
      appid: params.appId,
      keyid: params.keyId,
      start: params.start,
      end: params.end,
    },
  });
  return response.data;
}
