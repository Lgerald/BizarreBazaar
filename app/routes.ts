import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("users", "routes/users.tsx"),
  route("users/:userId", "routes/users.$userId.tsx"),
  route("books", "routes/books.tsx"),
] satisfies RouteConfig;
