"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useLanguage } from "@/components/language-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trash2, Edit, Loader2, ShieldCheck, User as UserIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createUserAction, updateUserRoleAndPermissions, deleteUserAction } from "@/app/actions/users"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

type UserProfile = {
    id: string
    email: string
    role: 'superadmin' | 'admin' | 'user'
    permissions: string[]
    created_at: string
}

const SECTION_OPTIONS = [
    { id: "register", label: "Familjeregister" },
    { id: "payments", label: "Betalningar" },
    { id: "income", label: "Intäkter" },
    { id: "expenses", label: "Utgifter" },
    { id: "stats", label: "Statistik" }
]

export default function UsersPage() {
    const { t } = useLanguage()
    const supabase = createClient()
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    // Auth context
    const [currentUserRole, setCurrentUserRole] = useState<string>("user")

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

    // Form state
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")

    // New user form
    const [newEmail, setNewEmail] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [newRole, setNewRole] = useState<'admin' | 'user'>('user')
    const [newPermissions, setNewPermissions] = useState<string[]>([])

    // Edit user form
    const [editRole, setEditRole] = useState<'superadmin' | 'admin' | 'user'>('user')
    const [editPermissions, setEditPermissions] = useState<string[]>([])

    const fetchUsers = async () => {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user?.id) {
            // Get current user's role to determine what they can see/do
            const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', session.user.id).single()
            if (profile) setCurrentUserRole(profile.role)
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setUsers(data as UserProfile[])
        setLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [supabase])

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg("")
        setIsSubmitting(true)

        const formData = new FormData()
        formData.append('email', newEmail)
        formData.append('password', newPassword)
        formData.append('role', newRole)
        newPermissions.forEach(p => formData.append('permissions', p))

        const result = await createUserAction(formData)

        if (result.success) {
            setIsCreateOpen(false)
            setNewEmail("")
            setNewPassword("")
            setNewRole("user")
            setNewPermissions([])
            fetchUsers()
        } else {
            setErrorMsg(result.error || "Ett fel uppstod.")
        }
        setIsSubmitting(false)
    }

    const openEditModal = (user: UserProfile) => {
        setSelectedUser(user)
        setEditRole(user.role)
        setEditPermissions(user.permissions || [])
        setIsEditOpen(true)
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedUser) return

        setErrorMsg("")
        setIsSubmitting(true)

        const result = await updateUserRoleAndPermissions(selectedUser.id, editRole, editPermissions)

        if (result.success) {
            setIsEditOpen(false)
            fetchUsers()
        } else {
            setErrorMsg(result.error || "Misslyckades att uppdatera.")
        }
        setIsSubmitting(false)
    }

    const handleDelete = async (id: string, role: string) => {
        if (!confirm("Är du säker på att du vill radera denna användare? Detta kan inte ångras.")) return

        // Prevent deleting superadmin if not superadmin
        if (role === 'superadmin' && currentUserRole !== 'superadmin') {
            alert("Du har inte behörighet att radera en superadmin.")
            return
        }

        const result = await deleteUserAction(id)
        if (result.success) {
            fetchUsers()
        } else {
            alert(result.error || "Misslyckades att radera.")
        }
    }

    const togglePermission = (permId: string, currentPerms: string[], setPerms: (p: string[]) => void) => {
        if (currentPerms.includes(permId)) {
            setPerms(currentPerms.filter(p => p !== permId))
        } else {
            setPerms([...currentPerms, permId])
        }
    }

    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (currentUserRole === 'user') {
        return <div className="p-8">Obehörig åtkomst.</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t("page.users.title") || "Användare"}</h2>
                    <p className="text-muted-foreground">{t("page.users.desc") || "Hantera systemets användare och deras åtkomst."}</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="premium-gradient text-primary-foreground border-0">
                            <Plus className="mr-2 h-4 w-4" />
                            {t("page.users.add") || "Skapa Användare"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Skapa ny användare</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
                            {errorMsg && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{errorMsg}</div>}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">E-post</label>
                                <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Lösenord</label>
                                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Roll</label>
                                <Select value={newRole} onValueChange={(v: 'admin' | 'user') => setNewRole(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Välj roll" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">Användare</SelectItem>
                                        <SelectItem value="admin">Administratör</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {newRole === 'user' && (
                                <div className="space-y-3 pt-2">
                                    <label className="text-sm font-medium">Behörigheter (Vilka sidor får de se?)</label>
                                    <div className="grid gap-2 border rounded-md p-3 bg-muted/30">
                                        {SECTION_OPTIONS.map((section) => (
                                            <div key={section.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`new-perm-${section.id}`}
                                                    checked={newPermissions.includes(section.id)}
                                                    onCheckedChange={() => togglePermission(section.id, newPermissions, setNewPermissions)}
                                                />
                                                <label htmlFor={`new-perm-${section.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {section.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button type="submit" className="w-full mt-4 premium-gradient border-0 text-white" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {t("form.user.btn_save") || "Skapa konto"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="premium-border overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <CardTitle className="text-lg">Alla användare</CardTitle>
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t("page.users.search") || "Sök..."}
                                className="pl-8 sm:w-[300px]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">E-post</th>
                                    <th className="px-6 py-3 font-medium">Roll</th>
                                    <th className="px-6 py-3 font-medium">Behörigheter</th>
                                    <th className="px-6 py-3 font-medium text-right">Åtgärder</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Laddar användare...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                            {users.length === 0 ? "Inga användare ännu." : "Inga träffar på din sökning."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="border-b transition-colors hover:bg-muted/50 last:border-0">
                                            <td className="px-6 py-4 font-medium">
                                                <div className="flex items-center gap-2">
                                                    {user.role === 'superadmin' ? <ShieldCheck className="h-4 w-4 text-indigo-500" /> : <UserIcon className="h-4 w-4 text-muted-foreground" />}
                                                    {user.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${user.role === 'superadmin' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                        user.role === 'admin' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            'bg-secondary text-secondary-foreground'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.role === 'superadmin' || user.role === 'admin' ? (
                                                    <span className="text-xs text-muted-foreground italic">Fullständig åtkomst</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.permissions && user.permissions.length > 0 ? (
                                                            user.permissions.map(p => (
                                                                <span key={p} className="inline-flex px-1.5 py-0.5 border rounded text-[10px] uppercase tracking-wider text-muted-foreground">
                                                                    {p}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">Inga sidor valda</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditModal(user)}>
                                                        <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(user.id, user.role)}
                                                        disabled={user.role === 'superadmin' && currentUserRole !== 'superadmin'}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Redigera behörighet</DialogTitle>
                        <DialogDescription>{selectedUser?.email}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
                        {errorMsg && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{errorMsg}</div>}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Roll</label>
                            <Select
                                value={editRole}
                                onValueChange={(v: any) => setEditRole(v)}
                                disabled={selectedUser?.role === 'superadmin' && currentUserRole !== 'superadmin'}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Användare</SelectItem>
                                    <SelectItem value="admin">Administratör</SelectItem>
                                    {currentUserRole === 'superadmin' && (
                                        <SelectItem value="superadmin">Superadmin</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {editRole === 'user' && (
                            <div className="space-y-3 pt-2">
                                <label className="text-sm font-medium">Behörigheter (Vilka sidor får de se?)</label>
                                <div className="grid gap-2 border rounded-md p-3 bg-muted/30">
                                    {SECTION_OPTIONS.map((section) => (
                                        <div key={section.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`edit-perm-${section.id}`}
                                                checked={editPermissions.includes(section.id)}
                                                onCheckedChange={() => togglePermission(section.id, editPermissions, setEditPermissions)}
                                            />
                                            <label htmlFor={`edit-perm-${section.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {section.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button type="submit" className="w-full mt-4 premium-gradient border-0 text-white" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Spara ändringar
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
