import { Link } from "react-router-dom";
import { PageMessage, btn } from "../components/common/ui";
import useDocumentTitle from "../hooks/useDocumentTitle";

// Shown outside the app shell (no route matched), so it fills the screen itself.
const NotFound = () => {
  useDocumentTitle("Page not found");
  return (
  <main className="grid min-h-screen place-items-center bg-white">
    <PageMessage
      title="Page not found"
      action={
        <Link to="/" className={btn}>
          Back to home
        </Link>
      }
    >
      This page doesn't exist or has been moved.
    </PageMessage>
  </main>
  );
};

export default NotFound;
