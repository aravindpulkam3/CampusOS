export const getNotificationPath = (notification) => {
  const targetId = notification?.targetId?._id || notification?.targetId;

  switch (notification?.targetType) {
    case "event":
      return targetId ? `/community/events/${targetId}` : "/community/events";
    case "drive":
    case "application":
      return targetId ? `/career/drives/${targetId}` : "/career/drives";
    case "discussion":
      return targetId ? `/discussions/${targetId}` : "/discussions";
    case "announcement":
      return "/community/announcements";
    default:
      return "/";
  }
};
