import { SUGGESTIONS } from '../../lib/discovery';
export default function handler(req, res) {
  res.json(SUGGESTIONS);
}
