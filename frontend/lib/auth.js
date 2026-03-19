import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

export async function verifyAuth(req) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (e) {
        return null;
    }
}

export function generateToken(id) {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });
}
