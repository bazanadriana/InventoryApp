import express from "express";
import session from "express-session";
import passport from "./auth/passport.js";
import authRoutes from "./auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import inventoryRoutes from "./modules/inventories/inventory.routes.js";
import { notFound, onError } from "./middleware/error.js";

const app = express();

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "dev-session-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/inventories", inventoryRoutes);

// error handling
app.use(notFound);
app.use(onError);

export default app;
