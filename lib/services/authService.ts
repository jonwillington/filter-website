import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  deleteUser,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../config/firebase';

class AuthService {
  /**
   * Sign in with Google (web popup flow)
   */
  async signInWithGoogle(): Promise<User> {
    if (!auth) throw new Error('Auth not initialized');

    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with Apple (web popup flow)
   */
  async signInWithApple(): Promise<User> {
    if (!auth) throw new Error('Auth not initialized');

    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');

    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (!auth) throw new Error('Auth not initialized');
    await firebaseSignOut(auth);
  }

  /**
   * Delete account
   */
  async deleteAccount(): Promise<void> {
    if (!auth?.currentUser) throw new Error('No user signed in');
    await deleteUser(auth.currentUser);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return auth?.currentUser || null;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Handle auth errors
   */
  private handleAuthError(error: any): Error {
    let message = 'Authentication failed';

    switch (error.code) {
      case 'auth/popup-closed-by-user':
        message = 'Sign-in cancelled';
        break;
      case 'auth/popup-blocked':
        message = 'Popup blocked. Please allow popups for this site.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many attempts. Please try again later.';
        break;
      case 'auth/account-exists-with-different-credential':
        message = 'An account already exists with the same email but different sign-in credentials.';
        break;
      default:
        message = error.message || message;
    }

    return new Error(message);
  }
}

export const authService = new AuthService();
