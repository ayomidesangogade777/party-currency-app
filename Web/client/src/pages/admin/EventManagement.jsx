import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  AlertCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  UserCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import adminApi from "@/api/adminApi";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import EventCard from "@/components/events/EventCard";

// Main Component
export default function EventManagement() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("-created_at");
  const pageSize = 10;

  // State for delivery status changes
  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [showUpdateButtons, setShowUpdateButtons] = useState({});

  // State for user info dialog
  const [userInfoDialog, setUserInfoDialog] = useState({
    open: false,
    loading: false,
    user: null,
    error: null,
  });

  // Delivery status options
  const deliveryStatusOptions = [
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "in_transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
    { value: "on_hold", label: "On Hold" },
  ];

  // Listen for sidebar state changes
  useEffect(() => {
    const handleSidebarStateChange = (event) => {
      setSidebarCollapsed(event.detail.isCollapsed);
    };

    window.addEventListener("sidebarStateChange", handleSidebarStateChange);
    return () =>
      window.removeEventListener(
        "sidebarStateChange",
        handleSidebarStateChange
      );
  }, []);

  // Fetch events
  const fetchEvents = async (
    page = currentPage,
    search = searchTerm,
    sort = sortBy
  ) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getEvents(page, pageSize, search, sort);
      setEvents(response.events || []);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message || "Failed to fetch events");
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle search
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
    fetchEvents(1, value, sortBy);
  };

  // Handle sort change
  const handleSortChange = (value) => {
    setSortBy(value);
    setCurrentPage(1);
    fetchEvents(1, searchTerm, value);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchEvents(page, searchTerm, sortBy);
  };

  // Handle status selection change
  const handleStatusSelection = (eventId, newStatus, currentStatus) => {
    setSelectedStatuses((prev) => ({
      ...prev,
      [eventId]: newStatus,
    }));

    // Show update button if status is different from current
    setShowUpdateButtons((prev) => ({
      ...prev,
      [eventId]: newStatus !== currentStatus,
    }));
  };

  // Handle status update
  const handleStatusUpdate = async (eventId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await adminApi.changeDeliveryStatus(eventId, newStatus);
      // Update the local state
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.event_id === eventId
            ? { ...event, delivery_status: newStatus }
            : event
        )
      );

      // Hide the update button
      setShowUpdateButtons((prev) => ({
        ...prev,
        [eventId]: false,
      }));

      toast.success("Delivery status updated successfully");
    } catch (error) {
      toast.error("Failed to update delivery status");
      throw error;
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle user info dialog
  const handleViewUserInfo = async (userEmail) => {
    setUserInfoDialog({
      open: true,
      loading: true,
      user: null,
      error: null,
    });

    try {
      const response = await adminApi.getUserByEmail(userEmail);
      setUserInfoDialog({
        open: true,
        loading: false,
        user: response.user,
        error: null,
      });
    } catch (error) {
      setUserInfoDialog({
        open: true,
        loading: false,
        user: null,
        error: error.message || "Failed to fetch user information",
      });
    }
  };

  const closeUserInfoDialog = () => {
    setUserInfoDialog({
      open: false,
      loading: false,
      user: null,
      error: null,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <AdminHeader toggleMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl font-semibold font-playfair">
              Event Management
            </h1>
            <div className="text-sm text-gray-500">
              {pagination && `${pagination.total_count} total events`}
            </div>
          </div>

          {/* Filters and Search */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search events by name, author, or location..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created_at">Newest First</SelectItem>
                    <SelectItem value="created_at">Oldest First</SelectItem>
                    <SelectItem value="event_name">Name A-Z</SelectItem>
                    <SelectItem value="-event_name">Name Z-A</SelectItem>
                    <SelectItem value="start_date">
                      Event Date (Early)
                    </SelectItem>
                    <SelectItem value="-start_date">
                      Event Date (Late)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Events List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading events...</span>
            </div>
          ) : error ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Events
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => fetchEvents()} variant="outline">
                Try Again
              </Button>
            </Card>
          ) : events.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Events Found
              </h3>
              <p className="text-gray-600">
                {searchTerm
                  ? "No events match your search criteria."
                  : "No events have been created yet."}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.event_id} className="">
                  <EventCard event={event} />

                  {/* Admin Controls for Delivery Status */}
                  <Card className="p-3 sm:p-4 bg-gold/30 border-gold rounded-b-lg rounded-t-none">
                    <div className="flex flex-col gap-3">
                      {/* User Info Section */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <UserCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium text-gray-700">
                            Author:
                          </span>
                          <span className="text-xs sm:text-sm text-gray-900 truncate">
                            {event.event_author}
                          </span>
                        </div>
                        <Button
                          onClick={() => handleViewUserInfo(event.event_author)}
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-2 sm:px-3 flex-shrink-0"
                        >
                          <User className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">User Info</span>
                          <span className="sm:hidden">User Info</span>
                        </Button>
                      </div>

                      {/* Delivery Status Section */}
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-medium text-gray-700">
                              Status:
                            </span>
                            <span
                              className={cn(
                                "px-2 py-1 rounded-full text-xs font-bold",
                                event.delivery_status.includes("delivered") &&
                                  "bg-green-100 text-green-800",
                                event.delivery_status.includes("in_transit") &&
                                  "bg-blue-100 text-blue-800",
                                event.delivery_status.includes("processing") &&
                                  "bg-yellow-100 text-yellow-800",
                                event.delivery_status.includes("pending") &&
                                  "bg-gray-300 text-gray-800",
                                event.delivery_status.includes("cancelled") &&
                                  "bg-red-100 text-red-800",
                                event.delivery_status.includes("on_hold") &&
                                  "bg-orange-100 text-orange-800"
                              )}
                            >
                              {deliveryStatusOptions.find(
                                (opt) => opt.value === event.delivery_status
                              )?.label || event.delivery_status}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-medium text-gray-700 flex-shrink-0">
                              Change to:
                            </span>
                            <Select
                              value={
                                selectedStatuses[event.event_id] ||
                                event.delivery_status
                              }
                              onValueChange={(value) =>
                                handleStatusSelection(
                                  event.event_id,
                                  value,
                                  event.delivery_status
                                )
                              }
                            >
                              <SelectTrigger className="w-32 sm:w-40 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {deliveryStatusOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    className="text-xs"
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {showUpdateButtons[event.event_id] && (
                            <Button
                              onClick={() =>
                                handleStatusUpdate(
                                  event.event_id,
                                  selectedStatuses[event.event_id]
                                )
                              }
                              disabled={updatingStatus}
                              size="sm"
                              className="bg-bluePrimary hover:bg-bluePrimary/90 h-8 px-2 sm:px-3 text-xs"
                            >
                              {updatingStatus ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1 text-white"></div>
                                  <span className="hidden sm:inline">
                                    Updating...
                                  </span>
                                  <span className="sm:hidden">...</span>
                                </>
                              ) : (
                                <>
                                  <span className="hidden sm:inline text-white">
                                    Update Status
                                  </span>
                                  <span className="sm:hidden">Update</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing page {pagination.current_page} of{" "}
                  {pagination.total_pages} ({pagination.total_count} total
                  events)
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(pagination.current_page - 1)
                    }
                    disabled={!pagination.has_previous}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(5, pagination.total_pages) },
                      (_, i) => {
                        let pageNum;
                        if (pagination.total_pages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.current_page <= 3) {
                          pageNum = i + 1;
                        } else if (
                          pagination.current_page >=
                          pagination.total_pages - 2
                        ) {
                          pageNum = pagination.total_pages - 4 + i;
                        } else {
                          pageNum = pagination.current_page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={
                              pageNum === pagination.current_page
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(pagination.current_page + 1)
                    }
                    disabled={!pagination.has_next}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* User Info Dialog */}
      <Dialog open={userInfoDialog.open} onOpenChange={closeUserInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              User Information
            </DialogTitle>
            <DialogDescription>
              Contact details for the event author
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {userInfoDialog.loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading user data...</span>
              </div>
            ) : userInfoDialog.error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">Error</p>
                <p className="text-gray-600 text-sm">{userInfoDialog.error}</p>
              </div>
            ) : userInfoDialog.user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-sm text-gray-900">
                      {userInfoDialog.user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Full Name
                    </p>
                    <p className="text-sm text-gray-900">
                      {userInfoDialog.user.first_name}{" "}
                      {userInfoDialog.user.last_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Phone Number
                    </p>
                    <p className="text-sm text-gray-900">
                      {userInfoDialog.user.phone_number || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <UserCircle className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      User Type
                    </p>
                    <p className="text-sm text-gray-900 capitalize">
                      {userInfoDialog.user.type || "Standard"}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        window.open(`mailto:${userInfoDialog.user.email}`)
                      }
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Send Email
                    </Button>
                    {userInfoDialog.user.phone_number && (
                      <Button
                        onClick={() =>
                          window.open(`tel:${userInfoDialog.user.phone_number}`)
                        }
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
