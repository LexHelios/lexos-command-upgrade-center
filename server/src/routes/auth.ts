import { Hono } from 'hono';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

const authRouter = new Hono();

// Simple in-memory user store (replace with database later)
const users = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Request schemas
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// Helper to generate JWT
function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

authRouter.post('/signInWithPassword', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = signInSchema.parse(body);
    
    // For now, accept any login
    const userId = `user-${Date.now()}`;
    const user = {
      id: userId,
      email,
      created_at: new Date().toISOString()
    };
    
    const token = generateToken(userId);
    
    return c.json({
      user,
      session: {
        access_token: token,
        token_type: 'bearer',
        expires_in: 604800
      }
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return c.json({ error: 'Invalid credentials' }, 400);
  }
});

authRouter.post('/signUp', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = signUpSchema.parse(body);
    
    // Create new user
    const userId = `user-${Date.now()}`;
    const user = {
      id: userId,
      email,
      created_at: new Date().toISOString()
    };
    
    users.set(userId, { ...user, password });
    const token = generateToken(userId);
    
    return c.json({
      user,
      session: {
        access_token: token,
        token_type: 'bearer',
        expires_in: 604800
      }
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return c.json({ error: 'Registration failed' }, 400);
  }
});

authRouter.post('/signOut', async (c) => {
  // Just return success
  return c.json({ success: true });
});

authRouter.get('/getSession', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ session: null });
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    return c.json({
      session: {
        access_token: token,
        token_type: 'bearer',
        expires_in: 604800,
        user: {
          id: decoded.userId,
          email: 'user@example.com'
        }
      }
    });
  } catch {
    return c.json({ session: null });
  }
});

// Auth status endpoint
authRouter.get('/status', (c) => {
  return c.json({
    status: 'active',
    providers: ['local', 'google', 'github'],
    features: ['login', 'register', 'password_reset']
  });
});

export default authRouter;