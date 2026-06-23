import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Opt a route out of the global AuthGuard (browse/health are public). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
