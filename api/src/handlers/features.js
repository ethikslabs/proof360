import { FEATURES } from '../config/features.js';

export async function featuresHandler(request, reply) {
  return reply.send(FEATURES);
}
