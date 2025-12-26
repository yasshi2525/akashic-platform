import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [GitHub],
    callbacks: {
        session({ session }) {
            if (!session.user.id && session.user.name) {
                session.user.id = session.user.name;
            }
            return session;
        },
    },
});
