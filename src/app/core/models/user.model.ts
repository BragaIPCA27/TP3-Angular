export interface User {
  id:        string;
  name:      string;
  username:  string;
  email:     string;
  role:      'user' | 'admin';
  avatar?:   string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user:  User;
}

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface RegisterPayload {
  name:     string;
  username: string;
  email:    string;
  password: string;
}
