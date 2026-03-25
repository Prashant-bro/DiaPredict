import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { generateToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        await dbConnect();
        const { email, password } = await req.json();

        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
        }

        return NextResponse.json({
            token: generateToken(user._id),
            user: { _id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error("[Login Error]:", error.message, error.stack);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
