import { invalidateSession } from '~/server/utils/session-helpers';
import { throwNotFoundError } from '~/server/utils/errorHandling';
import * as Schema from '../schema/stripe.schema';
import { prisma } from '~/server/db/client';
import { getServerStripe } from '~/server/utils/get-server-stripe';
import { Stripe } from 'stripe';
import { getBaseUrl } from '~/server/utils/url-helpers';

const baseUrl = getBaseUrl();

export const getPlans = async () => {
  const products = await prisma.product.findMany({
    where: { active: true, prices: { some: { type: 'recurring', active: true } } },
    select: {
      id: true,
      name: true,
      description: true,
      metadata: true,
      defaultPriceId: true,
      prices: {
        select: {
          id: true,
          interval: true,
          intervalCount: true,
          type: true,
          unitAmount: true,
          currency: true,
          metadata: true,
        },
      },
    },
  });

  // Only show the default price for a subscription product
  return products
    .map(({ prices, ...product }) => {
      const price = prices.filter((x) => x.id === product.defaultPriceId)[0];
      return {
        ...product,
        price: { ...price, unitAmount: price.unitAmount ?? 0 },
      };
    })
    .sort((a, b) => a.price.unitAmount - b.price.unitAmount);
};

export const getUserSubscription = async ({ userId }: Schema.GetUserSubscriptionInput) => {
  const subscription = await prisma.customerSubscription.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      cancelAtPeriodEnd: true,
      cancelAt: true,
      canceledAt: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      createdAt: true,
      endedAt: true,
      product: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      price: {
        select: {
          id: true,
          unitAmount: true,
          interval: true,
          intervalCount: true,
          currency: true,
        },
      },
    },
  });

  if (!subscription)
    throw throwNotFoundError(`Could not find subscription for user with id: ${userId}`);

  return {
    ...subscription,
    price: { ...subscription.price, unitAmount: subscription.price.unitAmount ?? 0 },
  };
};

export const createCustomer = async ({ id, email }: Schema.CreateCustomerInput) => {
  const stripe = await getServerStripe();

  const user = await prisma.user.findUnique({ where: { id }, select: { customerId: true } });
  if (!user?.customerId) {
    const customer = await stripe.customers.create({ email });

    await prisma.user.update({ where: { id }, data: { customerId: customer.id } });
    invalidateSession(id);

    return customer.id;
  } else {
    return user.customerId;
  }
};

export const createSubscribeSession = async ({
  priceId,
  customerId,
  user,
}: Schema.CreateSubscribeSessionInput & {
  customerId?: string;
  user: Schema.CreateCustomerInput;
}) => {
  const stripe = await getServerStripe();

  if (!customerId) {
    customerId = await createCustomer(user);
  }

  // array of items we are charging the customer
  const lineItems = [
    {
      price: priceId,
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: lineItems,
    success_url: `${baseUrl}/payment/success`,
    cancel_url: `${baseUrl}/pricing`,
  });

  return { sessionId: session.id };
};

export const createPortalSession = async ({ customerId }: { customerId: string }) => {
  const stripe = await getServerStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/pricing`,
  });

  return { url: session.url };
};

export const createManageSubscriptionSession = async ({ customerId }: { customerId: string }) => {
  const stripe = await getServerStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/user/account`,
  });

  return { url: session.url };
};

export const manageSubscriptionStatusChange = async (
  subscriptionId: string,
  customerId: string
) => {
  const stripe = await getServerStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['plan'] });
  console.log('----MANAGE SUBSCRIPTION STATUS CHANGE----');
  console.log({ subscription });

  const user = await prisma.user.findFirst({
    where: { customerId: customerId },
    select: { id: true, customerId: true, subscriptionId: true },
  });

  if (!user) throw throwNotFoundError(`User with customerId: ${customerId} not found`);

  const data = {
    id: subscription.id,
    userId: user.id,
    metadata: subscription.metadata,
    status: subscription.status,
    // as far as I can tell, there are never multiple items in this array
    priceId: subscription.items.data[0].price.id,
    productId: subscription.items.data[0].price.product as string,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: subscription.cancel_at ? toDateTime(subscription.cancel_at) : null,
    canceledAt: subscription.canceled_at ? toDateTime(subscription.canceled_at) : null,
    currentPeriodStart: toDateTime(subscription.current_period_start),
    currentPeriodEnd: toDateTime(subscription.current_period_end),
    createdAt: toDateTime(subscription.created),
    endedAt: subscription.ended_at ? toDateTime(subscription.ended_at) : null,
  };

  await prisma.$transaction([
    prisma.customerSubscription.upsert({ where: { id: data.id }, update: data, create: data }),
    prisma.user.update({ where: { id: user.id }, data: { subscriptionId: subscription.id } }),
  ]);

  invalidateSession(user.id);
};

export const upsertSubscription = async (subscription: Stripe.Subscription, customerId: string) => {
  const user = await prisma.user.findFirst({
    where: { customerId: customerId },
    select: { id: true, customerId: true, subscriptionId: true },
  });

  if (!user) throw throwNotFoundError(`User with customerId: ${customerId} not found`);

  const data = {
    id: subscription.id,
    userId: user.id,
    metadata: subscription.metadata,
    status: subscription.status,
    // as far as I can tell, there are never multiple items in this array
    priceId: subscription.items.data[0].price.id,
    productId: subscription.items.data[0].price.product as string,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: subscription.cancel_at ? toDateTime(subscription.cancel_at) : null,
    canceledAt: subscription.canceled_at ? toDateTime(subscription.canceled_at) : null,
    currentPeriodStart: toDateTime(subscription.current_period_start),
    currentPeriodEnd: toDateTime(subscription.current_period_end),
    createdAt: toDateTime(subscription.created),
    endedAt: subscription.ended_at ? toDateTime(subscription.ended_at) : null,
  };

  await prisma.$transaction([
    prisma.customerSubscription.upsert({ where: { id: data.id }, update: data, create: data }),
    prisma.user.update({ where: { id: user.id }, data: { subscriptionId: subscription.id } }),
  ]);

  invalidateSession(user.id);
};

export const toDateTime = (secs: number) => {
  const t = new Date('1970-01-01T00:30:00Z'); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};

export const upsertProductRecord = async (product: Stripe.Product) => {
  const productData = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? null,
    metadata: product.metadata,
    defaultPriceId: product.default_price as string | null,
  };
  await prisma.product.upsert({
    where: { id: product.id },
    update: productData,
    create: productData,
  });
};

export const upsertPriceRecord = async (price: Stripe.Price) => {
  const priceData = {
    id: price.id,
    productId: typeof price.product === 'string' ? price.product : '',
    active: price.active,
    currency: price.currency,
    description: price.nickname ?? undefined,
    type: price.type,
    unitAmount: price.unit_amount,
    interval: price.recurring?.interval,
    intervalCount: price.recurring?.interval_count,
    metadata: price.metadata,
  };
  await prisma.price.upsert({
    where: { id: price.id },
    update: priceData,
    create: priceData,
  });
};
