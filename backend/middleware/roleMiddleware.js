// Usage: roleMiddleware("superadmin") or roleMiddleware("superadmin", "placementCoordinator")
// For resource-scoped authority (e.g. "is this user the CR of THIS classroom"),
// use a relationship check instead — see classroomAuthMiddleware/clubAdminMiddleware.
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}.`,
      });
    }

    next();
  };
};

export default roleMiddleware;