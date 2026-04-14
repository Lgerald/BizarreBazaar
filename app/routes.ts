import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    index("routes/_index.tsx"),
    route("users", "routes/users.tsx"),
    route("users/:userId", "routes/users.$userId.tsx"),
    route("calendar", "routes/calendar.tsx"),
    route("books", "routes/books.tsx"),
    route("mall", "routes/mall.tsx"),
    route("login", "routes/login.tsx"),
  ]),
] satisfies RouteConfig;
