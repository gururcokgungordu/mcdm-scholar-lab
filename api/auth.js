import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, ...data } = req.body;

    try {
        switch (action) {
            case 'login': {
                const { data: user, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', data.email)
                    .eq('password', data.password)
                    .single();

                if (error || !user) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                const { password: _, ...safeUser } = user;
                return res.status(200).json({
                    user: { ...safeUser, isPro: user.is_pro, createdAt: new Date(user.created_at).getTime() }
                });
            }

            case 'register': {
                // Check if email exists
                const { data: existing } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', data.email)
                    .single();

                if (existing) {
                    return res.status(400).json({ error: 'Email already registered' });
                }

                const { data: user, error } = await supabase
                    .from('users')
                    .insert({
                        name: data.name,
                        email: data.email,
                        password: data.password,
                        university: data.university,
                        school: data.school,
                        purpose: data.purpose || 'research',
                        role: 'USER',
                        is_pro: false
                    })
                    .select()
                    .single();

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                const { password: _, ...safeUser } = user;
                return res.status(200).json({
                    user: { ...safeUser, isPro: user.is_pro, createdAt: new Date(user.created_at).getTime() }
                });
            }

            case 'getUsers': {
                const { data: users, error } = await supabase
                    .from('users')
                    .select('id, name, email, university, school, purpose, role, is_pro, created_at')
                    .order('created_at', { ascending: false });

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                return res.status(200).json({
                    users: users.map(u => ({ ...u, isPro: u.is_pro, createdAt: new Date(u.created_at).getTime() }))
                });
            }

            case 'updateUser': {
                const updates = {};
                if (data.name) updates.name = data.name;
                if (data.isPro !== undefined) updates.is_pro = data.isPro;
                if (data.role) updates.role = data.role;

                const { data: user, error } = await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', data.id)
                    .select()
                    .single();

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                return res.status(200).json({ user });
            }

            case 'deleteUser': {
                const { error } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', data.id);

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                return res.status(200).json({ success: true });
            }

            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: error.message });
    }
}
