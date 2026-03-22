import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { generateToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';

export async function POST(req) {
    try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        await dbConnect();
        const { credential } = await req.json();

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { name, email } = payload;

        let user = await User.findOne({ email });
        
        if (!user) {
            const generatePassword = () => Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            user = await User.create({
                name: name,
                email: email,
                password: generatePassword()
            });
        }

        return NextResponse.json({
            token: generateToken(user._id),
            user: { _id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error("Google Auth Error: ", error);
        return NextResponse.json({ message: "Google Authentication Failed" }, { status: 400 });
    }
}
