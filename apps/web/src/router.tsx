import { createBrowserRouter } from "react-router";

import { Layout } from "./components/Layout.js";
import { Home } from "./routes/Home.js";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [{ index: true, element: <Home /> }],
  },
]);
