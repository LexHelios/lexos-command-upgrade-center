// Local authentication service (no Supabase)
interface User {
  id: string;
  email: string;
  created_at: string;
}

class AuthService {
  private currentUser: User | null = null;
  private authListeners: ((user: User | null) => void)[] = [];

  constructor() {
    // Check localStorage for existing session
    const savedUser = localStorage.getItem('lexos_user');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    }
  }

  async signIn(email: string, password: string) {
    try {
      // For now, accept any login (replace with real auth later)
      const user: User = {
        id: 'local-user-' + Date.now(),
        email,
        created_at: new Date().toISOString()
      };
      
      this.currentUser = user;
      localStorage.setItem('lexos_user', JSON.stringify(user));
      this.notifyListeners();
      
      return { data: { user }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async signUp(email: string, password: string) {
    // Same as sign in for now
    return this.signIn(email, password);
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('lexos_user');
    this.notifyListeners();
    return { error: null };
  }

  getUser() {
    return this.currentUser;
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    this.authListeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners() {
    this.authListeners.forEach(callback => callback(this.currentUser));
  }
}

export const authService = new AuthService();