import { Link } from "react-router-dom";
import { PageMessage, btn } from "../components/common/ui";
import useDocumentTitle from "../hooks/useDocumentTitle";

// Shown inside the app shell when a signed-in user opens a page their role
// may not use.
const Forbidden = () => {
  useDocumentTitle("Access denied");
  return (
  <PageMessage
    title="Access denied"
    action={
      <Link to="/" className={btn}>
        Back to home
      </Link>
    }
  >
    You're not eligible to access this page. If you think this is a mistake, contact a superadmin.
  </PageMessage>
  );
};

export default Forbidden;
