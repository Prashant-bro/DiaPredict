import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { generateToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        await dbConnect();
        const { name, email, password } = await req.json();

        const userExists = await User.findOne({ email });
        if (userExists) {
            return NextResponse.json({ message: "User already exists" }, { status: 400 });
        }

        const user = await User.create({ name, email, password });
        return NextResponse.json({
            token: generateToken(user._id),
            user: { _id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
