import { Request, Response } from 'express';
import { NotificationSubscription } from '../models/NotificationSubscription';
import User from '../models/User';

// Subscribe to notifications
export const subscribe = async (req: Request, res: Response) => {
  try {
    const { pushToken, deviceType } = req.body;
    const userId = (req as any).user.id;

    // Check if subscription already exists for this push token
    let subscription = await NotificationSubscription.findOne({ pushToken });

    if (subscription) {
      // Update the subscription with current user info and reactivate
      // This handles the case when a different user logs in on the same device
      subscription.userId = userId;
      subscription.deviceType = deviceType || subscription.deviceType;
      subscription.isActive = true;
      subscription.subscribedAt = new Date();
      subscription.unsubscribedAt = undefined;
      await subscription.save();
    } else {
      // Create new subscription
      subscription = await NotificationSubscription.create({
        userId,
        pushToken,
        deviceType,
        isActive: true,
      });
    }

    res.status(200).json({
      message: 'Successfully subscribed to notifications',
      subscription,
    });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    res.status(500).json({ message: 'Failed to subscribe', error: error.message });
  }
};

// Unsubscribe from notifications
export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const { pushToken } = req.body;
    const userId = (req as any).user.id;

    const subscription = await NotificationSubscription.findOne({
      userId,
      pushToken,
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    subscription.isActive = false;
    subscription.unsubscribedAt = new Date();
    await subscription.save();

    res.status(200).json({
      message: 'Successfully unsubscribed from notifications',
    });
  } catch (error: any) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ message: 'Failed to unsubscribe', error: error.message });
  }
};

// Get user's subscription status
export const getStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const subscription = await NotificationSubscription.findOne({
      userId,
      isActive: true,
    });

    res.status(200).json({
      isSubscribed: !!subscription,
      subscription: subscription || null,
    });
  } catch (error: any) {
    console.error('Get status error:', error);
    res.status(500).json({ message: 'Failed to get status', error: error.message });
  }
};

// Admin: Get all subscriptions
export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const subscriptions = await NotificationSubscription.find({ isActive: true })
      .populate('userId', 'name email')
      .sort({ subscribedAt: -1 });

    const users = await User.find({
      _id: { $in: subscriptions.map(s => s.userId) },
    });

    res.status(200).json({
      total: subscriptions.length,
      subscriptions,
      users,
    });
  } catch (error: any) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({ message: 'Failed to get subscriptions', error: error.message });
  }
};

// Admin: Send notification to all subscribers
// Admin: Get all users (including non-subscribers)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Search parameter
    const search = req.query.search as string || '';
    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);

    // Get paginated users
    const users = await User.find(searchQuery)
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get subscription status for current page users
    const userIds = users.map(u => u._id);
    const subscriptions = await NotificationSubscription.find({
      userId: { $in: userIds },
      isActive: true
    });

    const subscriptionMap = new Map(
      subscriptions.map(s => [s.userId.toString(), s])
    );

    const usersWithStatus = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      isSubscribed: subscriptionMap.has(user._id.toString()),
      subscription: subscriptionMap.get(user._id.toString()) || null
    }));

    res.status(200).json({
      total: totalUsers,
      page,
      limit,
      totalPages: Math.ceil(totalUsers / limit),
      users: usersWithStatus,
    });
  } catch (error: any) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to get users', error: error.message });
  }
};

// Admin: Send notification to all subscribers
export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { title, body, data } = req.body;

    const subscriptions = await NotificationSubscription.find({ isActive: true });

    if (subscriptions.length === 0) {
      return res.status(404).json({ message: 'No active subscriptions found' });
    }

    // Prepare Expo push notifications with EVA logo
    const messages = subscriptions.map((sub) => ({
      to: sub.pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      badge: 1,
      channelId: 'default',
    }));

    // Send to Expo Push Notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    res.status(200).json({
      message: `Notifications sent to ${messages.length} subscribers`,
      result,
    });
  } catch (error: any) {
    console.error('Send notification error:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
};
