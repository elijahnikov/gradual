import { checkout, polar, portal, usage } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
export const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: "sandbox",
});

export const polarPlugin = polar({
  client: polarClient,
  createCustomerOnSignUp: true,
  use: [
    usage(),
    portal(),
    checkout({
      products: [
        {
          productId: "d9376414-2b89-48a8-bdec-7a97ba70e1c4",
          slug: "Enterprise",
        },
        {
          productId: "4e1c7974-4814-4d97-a117-aa72aad58771",
          slug: "Pro",
        },
        {
          productId: "fa8a8c64-d3ce-41f8-a28c-88073097e152",
          slug: "Free",
        },
      ],
      successUrl: process.env.POLAR_SUCCESS_URL,
      authenticatedUsersOnly: true,
    }),
  ],
});
