import { initializeApp, getApps } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export class FirebaseAuthService {
    /**
     * Sign in with email and password
     */
    static async signInWithEmail(email: string, password: string) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error: any) {
            console.error('Firebase sign in error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Sign up with email and password
     */
    static async signUpWithEmail(email: string, password: string, displayName?: string) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Update profile with display name if provided
            if (displayName && userCredential.user) {
                await updateProfile(userCredential.user, { displayName });
            }

            return userCredential.user;
        } catch (error: any) {
            console.error('Firebase sign up error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Sign in with Google
     */
    static async signInWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            return userCredential.user;
        } catch (error: any) {
            console.error('Firebase Google sign in error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Sign out
     */
    static async signOut() {
        try {
            await signOut(auth);
        } catch (error: any) {
            console.error('Firebase sign out error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Send password reset email
     */
    static async sendPasswordReset(email: string) {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            console.error('Firebase password reset error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get current user
     */
    static getCurrentUser(): User | null {
        return auth.currentUser;
    }

    /**
     * Listen to auth state changes
     */
    static onAuthStateChange(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback);
    }

    /**
     * Get auth token
     */
    static async getAuthToken(): Promise<string | null> {
        try {
            const user = auth.currentUser;
            if (user) {
                return await user.getIdToken();
            }
            return null;
        } catch (error: any) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }
}

export { auth };
export default FirebaseAuthService;
