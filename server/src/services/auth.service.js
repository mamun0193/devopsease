import User from "../models/User.js";

export async function resolveOAuthUser({
  provider,
  providerId,
  email,
}) {
  if (!email) {
    throw new Error("OAuth provider did not return email");
  }

  //  Provider match
  let user = await User.findOne({
    [`authProviders.${provider}.id`]: providerId,
  });

  //  Email match
  if (!user) {
    user = await User.findOne({ primaryEmail: email });
  }

  //  Create user
  if (!user) {
    user = await User.create({
      authProviders: {
        [provider]: { id: providerId, email },
      },
      primaryEmail: email,
      role: "operator",
      plan: "free",
      status: "active",
    });
  }

  // Link provider if missing
  if (!user.authProviders[provider]) {
    user.authProviders[provider] = { id: providerId, email };
    await user.save();
  }

  //  Update login time
  user.lastLoginAt = new Date();
  await user.save();

  return user;
}
