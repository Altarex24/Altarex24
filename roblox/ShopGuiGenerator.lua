--[[
	GÉNÉRATEUR DE SHOP GUI - Roblox Studio
	UTILISATION (la Command Bar coupe les longs collages, donc on passe par un ModuleScript) :
	  1. Dans l'Explorer : ServerStorage > Insert Object > ModuleScript, renomme-le "ShopGenerator".
	  2. Ouvre-le, efface tout, colle CE fichier en entier, ferme l'onglet.
	  3. View > Command Bar, colle cette seule ligne puis Entrée :
	       require(game.ServerStorage.ShopGenerator:Clone())
	  4. Tu peux ensuite supprimer ShopGenerator (ou le garder pour régénérer plus tard).

	Crée :
	  - StarterGui.ShopGui              (bouton SHOP + fenêtre du shop + LocalScript "ShopClient")
	  - ReplicatedStorage.ShopItems     (ModuleScript : la liste des articles, vide au départ)
	  - ReplicatedStorage.ShopRemotes   (RemoteFunction "Purchase")
	  - ServerScriptService.ShopServer  (Script : leaderstats "Coins" + validation des achats)

	Relancer le script remplace l'ancienne version (sauf ShopItems, pour garder tes articles).
	Ctrl+Z annule la génération.
]]

local StarterGui = game:GetService("StarterGui")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Selection = game:GetService("Selection")

ChangeHistoryService:SetWaypoint("Avant ShopGui")

local function clear(parent, name)
	local old = parent:FindFirstChild(name)
	if old then old:Destroy() end
end
clear(StarterGui, "ShopGui")
clear(ReplicatedStorage, "ShopRemotes")
clear(ServerScriptService, "ShopServer")

---------------------------------------------------------------------------
-- Style
---------------------------------------------------------------------------
local FONT = Enum.Font.FredokaOne
local WHITE = Color3.new(1, 1, 1)
local BLACK = Color3.new(0, 0, 0)
local TABS = { "Objets", "Skins", "Boosts" }

local C = {
	panel = Color3.fromRGB(34, 38, 56),
	inner = Color3.fromRGB(22, 25, 38),
	card = Color3.fromRGB(52, 58, 82),
	blue = Color3.fromRGB(0, 162, 255),
	green = Color3.fromRGB(0, 200, 95),
	red = Color3.fromRGB(255, 70, 70),
	gold = Color3.fromRGB(255, 195, 35),
	tabOff = Color3.fromRGB(70, 76, 105),
}

---------------------------------------------------------------------------
-- Helpers
---------------------------------------------------------------------------
local function new(className, props, children)
	local inst = Instance.new(className)
	for key, value in pairs(props or {}) do
		if key ~= "Parent" then inst[key] = value end
	end
	for _, child in ipairs(children or {}) do
		child.Parent = inst
	end
	if props and props.Parent then inst.Parent = props.Parent end
	return inst
end

local function corner(radius)
	return new("UICorner", { CornerRadius = radius })
end

local function border(thickness)
	return new("UIStroke", {
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
		Thickness = thickness or 3,
		Color = BLACK,
		LineJoinMode = Enum.LineJoinMode.Round,
	})
end

-- Dégradé blanc -> gris : donne l'effet "bouton bombé" typique de Roblox
local function shade()
	return new("UIGradient", {
		Rotation = 90,
		Color = ColorSequence.new(WHITE, Color3.fromRGB(185, 185, 185)),
	})
end

local function square()
	return new("UIAspectRatioConstraint", { AspectRatio = 1 })
end

local function label(props, maxSize, strokeThickness)
	props.BackgroundTransparency = 1
	props.Font = FONT
	props.TextColor3 = props.TextColor3 or WHITE
	props.TextScaled = true
	return new("TextLabel", props, {
		new("UIStroke", { Thickness = strokeThickness or 2, Color = BLACK }),
		new("UITextSizeConstraint", { MaxTextSize = maxSize or 40 }),
	})
end

-- Bouton : le texte est dans un TextLabel enfant pour que le dégradé ne le salisse pas
local function button(props, caption, maxSize)
	props.Text = ""
	props.AutoButtonColor = false
	local btn = new("TextButton", props, { corner(UDim.new(0.25, 0)), border(3), shade() })
	label({
		Name = "Label",
		Text = caption,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.fromScale(0.9, 0.7),
		Parent = btn,
	}, maxSize)
	return btn
end

---------------------------------------------------------------------------
-- ScreenGui
---------------------------------------------------------------------------
local gui = new("ScreenGui", {
	Name = "ShopGui",
	ResetOnSpawn = false,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
})

-- Bouton SHOP (à gauche de l'écran)
local openButton = new("TextButton", {
	Name = "OpenButton",
	Text = "",
	AutoButtonColor = false,
	AnchorPoint = Vector2.new(0, 0.5),
	Position = UDim2.fromScale(0.015, 0.5),
	Size = UDim2.fromScale(0.065, 0.065),
	BackgroundColor3 = C.green,
	Parent = gui,
}, {
	corner(UDim.new(0.25, 0)),
	border(4),
	shade(),
	square(),
	new("UISizeConstraint", { MinSize = Vector2.new(64, 64) }),
})
label({
	Name = "Icon",
	Text = "🛒",
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.fromScale(0.5, 0.06),
	Size = UDim2.fromScale(0.8, 0.55),
	Parent = openButton,
}, 60)
label({
	Name = "Label",
	Text = "SHOP",
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.fromScale(0.5, 0.94),
	Size = UDim2.fromScale(0.9, 0.3),
	Parent = openButton,
}, 30, 2.5)

-- Fenêtre du shop
local shop = new("Frame", {
	Name = "ShopFrame",
	Visible = false,
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.fromScale(0.55, 0.62),
	BackgroundColor3 = C.panel,
	Parent = gui,
}, {
	corner(UDim.new(0, 18)),
	border(4),
	new("UIAspectRatioConstraint", { AspectRatio = 1.55 }),
	new("UIScale", { Scale = 1 }),
})

-- En-tête
local header = new("Frame", {
	Name = "Header",
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.fromScale(0.5, 0.03),
	Size = UDim2.fromScale(0.96, 0.14),
	BackgroundColor3 = C.blue,
	Parent = shop,
}, { corner(UDim.new(0, 14)), border(3), shade() })
label({
	Name = "Title",
	Text = "🛒 SHOP",
	TextXAlignment = Enum.TextXAlignment.Left,
	AnchorPoint = Vector2.new(0, 0.5),
	Position = UDim2.fromScale(0.03, 0.5),
	Size = UDim2.fromScale(0.5, 0.75),
	Parent = header,
}, 48, 3)

-- Compteur de pièces
local coins = new("Frame", {
	Name = "Coins",
	AnchorPoint = Vector2.new(1, 0.5),
	Position = UDim2.fromScale(0.9, 0.5),
	Size = UDim2.fromScale(0.27, 0.68),
	BackgroundColor3 = C.gold,
	Parent = header,
}, { corner(UDim.new(0.5, 0)), border(3), shade() })
label({
	Name = "Icon",
	Text = "💰",
	AnchorPoint = Vector2.new(0, 0.5),
	Position = UDim2.fromScale(0.05, 0.5),
	Size = UDim2.fromScale(0.25, 0.85),
	Parent = coins,
}, 36)
label({
	Name = "Amount",
	Text = "0",
	TextXAlignment = Enum.TextXAlignment.Right,
	AnchorPoint = Vector2.new(1, 0.5),
	Position = UDim2.fromScale(0.92, 0.5),
	Size = UDim2.fromScale(0.62, 0.75),
	Parent = coins,
}, 34, 2.5)

-- Bouton fermer (coin en haut à droite, style Roblox)
local closeButton = button({
	Name = "CloseButton",
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.new(1, -6, 0, 6),
	Size = UDim2.fromScale(0.075, 0.075),
	BackgroundColor3 = C.red,
	ZIndex = 5,
	Parent = shop,
}, "X", 40)
square().Parent = closeButton

-- Onglets
local tabs = new("Frame", {
	Name = "Tabs",
	BackgroundTransparency = 1,
	Position = UDim2.fromScale(0.02, 0.2),
	Size = UDim2.fromScale(0.96, 0.09),
	Parent = shop,
}, {
	new("UIListLayout", {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0.015, 0),
		SortOrder = Enum.SortOrder.LayoutOrder,
		VerticalAlignment = Enum.VerticalAlignment.Center,
	}),
})
for i, name in ipairs(TABS) do
	button({
		Name = name,
		LayoutOrder = i,
		Size = UDim2.fromScale(0.22, 1),
		BackgroundColor3 = i == 1 and C.green or C.tabOff,
		Parent = tabs,
	}, name, 28)
end

-- Pages (une par onglet), vides
local pages = new("Frame", {
	Name = "Pages",
	Position = UDim2.fromScale(0.02, 0.32),
	Size = UDim2.fromScale(0.96, 0.65),
	BackgroundColor3 = C.inner,
	Parent = shop,
}, { corner(UDim.new(0, 14)), border(3) })

for i, name in ipairs(TABS) do
	new("ScrollingFrame", {
		Name = name,
		Visible = i == 1,
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		CanvasSize = UDim2.new(),
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollingDirection = Enum.ScrollingDirection.Y,
		ScrollBarThickness = 6,
		ScrollBarImageColor3 = WHITE,
		ScrollBarImageTransparency = 0.4,
		Parent = pages,
	}, {
		new("UIPadding", {
			PaddingTop = UDim.new(0, 12),
			PaddingBottom = UDim.new(0, 12),
			PaddingLeft = UDim.new(0, 12),
			PaddingRight = UDim.new(0, 12),
		}),
		new("UIGridLayout", {
			CellSize = UDim2.fromScale(0.22, 0.22),
			CellPadding = UDim2.fromOffset(12, 12),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}, {
			new("UIAspectRatioConstraint", { AspectRatio = 0.78 }),
		}),
	})
end

label({
	Name = "EmptyLabel",
	Text = "Le shop est vide pour le moment 👀",
	TextColor3 = Color3.fromRGB(160, 168, 200),
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.fromScale(0.8, 0.14),
	Parent = pages,
}, 30)

-- Modèle de carte d'article (invisible, cloné par le LocalScript)
local card = new("Frame", {
	Name = "ItemTemplate",
	Visible = false,
	Size = UDim2.fromOffset(130, 166),
	BackgroundColor3 = C.card,
	Parent = gui,
}, { corner(UDim.new(0, 12)), border(3), shade() })
new("ImageLabel", {
	Name = "Icon",
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.fromScale(0.5, 0.05),
	Size = UDim2.fromScale(0.62, 0.62),
	BackgroundColor3 = C.inner,
	ScaleType = Enum.ScaleType.Fit,
	Image = "",
	Parent = card,
}, { corner(UDim.new(0.2, 0)), square() })
label({
	Name = "ItemName",
	Text = "Nom de l'objet",
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.fromScale(0.5, 0.56),
	Size = UDim2.fromScale(0.9, 0.11),
	Parent = card,
}, 24)
label({
	Name = "Price",
	Text = "💰 0",
	TextColor3 = Color3.fromRGB(255, 210, 60),
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.fromScale(0.5, 0.68),
	Size = UDim2.fromScale(0.9, 0.09),
	Parent = card,
}, 22)
button({
	Name = "BuyButton",
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.fromScale(0.5, 0.95),
	Size = UDim2.fromScale(0.85, 0.16),
	BackgroundColor3 = C.green,
	Parent = card,
}, "ACHETER", 22)

---------------------------------------------------------------------------
-- Scripts
---------------------------------------------------------------------------

-- Liste des articles (gardée si elle existe déjà)
if not ReplicatedStorage:FindFirstChild("ShopItems") then
	local items = new("ModuleScript", { Name = "ShopItems" })
	items.Source = [==[
-- Liste des articles du shop.
-- Tab doit être le nom d'un onglet : "Objets", "Skins" ou "Boosts".
-- Id doit être unique. Image = un asset id (ex : "rbxassetid://123456").

return {
	-- { Id = "Sword", Name = "Épée", Price = 100, Tab = "Objets", Image = "rbxassetid://0" },
	-- { Id = "RedSkin", Name = "Skin rouge", Price = 250, Tab = "Skins", Image = "rbxassetid://0" },
}
]==]
	items.Parent = ReplicatedStorage
end

new("Folder", { Name = "ShopRemotes", Parent = ReplicatedStorage }, {
	new("RemoteFunction", { Name = "Purchase" }),
})

local server = new("Script", { Name = "ShopServer" })
server.Source = [==[
-- ShopServer : donne des pièces aux joueurs et valide les achats.
-- Le prix est TOUJOURS vérifié ici (jamais faire confiance au client).
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Items = require(ReplicatedStorage:WaitForChild("ShopItems"))
local purchase = ReplicatedStorage:WaitForChild("ShopRemotes"):WaitForChild("Purchase")

local START_COINS = 100

local itemsById = {}
for _, item in ipairs(Items) do
	itemsById[item.Id] = item
end

Players.PlayerAdded:Connect(function(player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player

	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Value = START_COINS
	coins.Parent = leaderstats

	local inventory = Instance.new("Folder")
	inventory.Name = "Inventory"
	inventory.Parent = player
end)

purchase.OnServerInvoke = function(player, itemId)
	if typeof(itemId) ~= "string" then return false, "Erreur" end

	local item = itemsById[itemId]
	if not item then return false, "Introuvable" end

	local leaderstats = player:FindFirstChild("leaderstats")
	local coins = leaderstats and leaderstats:FindFirstChild("Coins")
	local inventory = player:FindFirstChild("Inventory")
	if not coins or not inventory then return false, "Erreur" end

	if inventory:FindFirstChild(item.Id) then return false, "Déjà acheté" end
	if coins.Value < item.Price then return false, "Pas assez !" end

	coins.Value -= item.Price
	local owned = Instance.new("BoolValue")
	owned.Name = item.Id
	owned.Value = true
	owned.Parent = inventory

	return true, "Acheté !"
end
]==]
server.Parent = ServerScriptService

local client = new("LocalScript", { Name = "ShopClient" })
client.Source = [==[
-- ShopClient : ouvre/ferme le shop, gère les onglets et affiche les articles.
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local gui = script.Parent
local openButton = gui:WaitForChild("OpenButton")
local template = gui:WaitForChild("ItemTemplate")
local shop = gui:WaitForChild("ShopFrame")
local shopScale = shop:WaitForChild("UIScale")
local closeButton = shop:WaitForChild("CloseButton")
local coinsLabel = shop:WaitForChild("Header"):WaitForChild("Coins"):WaitForChild("Amount")
local tabs = shop:WaitForChild("Tabs")
local pages = shop:WaitForChild("Pages")
local emptyLabel = pages:WaitForChild("EmptyLabel")

local Items = require(ReplicatedStorage:WaitForChild("ShopItems"))
local purchase = ReplicatedStorage:WaitForChild("ShopRemotes"):WaitForChild("Purchase")

local GREEN = Color3.fromRGB(0, 200, 95)
local RED = Color3.fromRGB(255, 70, 70)
local TAB_OFF = Color3.fromRGB(70, 76, 105)
local FAST = TweenInfo.new(0.12, Enum.EasingStyle.Quad)

local isOpen = false
local currentPage = nil

-- Petit effet quand on survole / clique un bouton
local function addHover(button)
	local scale = Instance.new("UIScale")
	scale.Parent = button
	local function to(value)
		TweenService:Create(scale, FAST, { Scale = value }):Play()
	end
	button.MouseEnter:Connect(function() to(1.06) end)
	button.MouseLeave:Connect(function() to(1) end)
	button.MouseButton1Down:Connect(function() to(0.94) end)
	button.MouseButton1Up:Connect(function() to(1.06) end)
end

-- Ouvrir / fermer avec une animation "pop"
local function setOpen(open)
	isOpen = open
	if open then
		shop.Visible = true
		shopScale.Scale = 0
		TweenService:Create(shopScale, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
	else
		local tween = TweenService:Create(shopScale, TweenInfo.new(0.15, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { Scale = 0 })
		tween:Play()
		tween.Completed:Once(function()
			if not isOpen then shop.Visible = false end
		end)
	end
end

local function countItems(page)
	local count = 0
	for _, child in ipairs(page:GetChildren()) do
		if child:IsA("Frame") then count += 1 end
	end
	return count
end

local function selectTab(name)
	for _, tab in ipairs(tabs:GetChildren()) do
		if tab:IsA("TextButton") then
			local color = tab.Name == name and GREEN or TAB_OFF
			TweenService:Create(tab, FAST, { BackgroundColor3 = color }):Play()
		end
	end
	for _, page in ipairs(pages:GetChildren()) do
		if page:IsA("ScrollingFrame") then
			page.Visible = page.Name == name
			if page.Visible then currentPage = page end
		end
	end
	emptyLabel.Visible = currentPage == nil or countItems(currentPage) == 0
end

local function createCard(item, index)
	local page = pages:FindFirstChild(item.Tab or "")
	if not page or not page:IsA("ScrollingFrame") then
		warn(("[Shop] Onglet inconnu '%s' pour l'article '%s'"):format(tostring(item.Tab), tostring(item.Id)))
		return
	end

	local card = template:Clone()
	card.Name = item.Id
	card.LayoutOrder = index
	card.Visible = true
	card.Icon.Image = item.Image or ""
	card.ItemName.Text = item.Name or item.Id
	card.Price.Text = "💰 " .. tostring(item.Price)

	local buy = card.BuyButton
	local busy = false
	addHover(buy)
	buy.MouseButton1Click:Connect(function()
		if busy then return end
		busy = true
		local ok, success, message = pcall(purchase.InvokeServer, purchase, item.Id)
		if not ok then success, message = false, "Erreur" end
		buy.Label.Text = message or (success and "Acheté !" or "Impossible")
		buy.BackgroundColor3 = success and GREEN or RED
		task.wait(1.2)
		buy.Label.Text = "ACHETER"
		buy.BackgroundColor3 = GREEN
		busy = false
	end)

	card.Parent = page
end

-- Articles
for index, item in ipairs(Items) do
	createCard(item, index)
end

-- Onglets
local firstTab = nil
for _, tab in ipairs(tabs:GetChildren()) do
	if tab:IsA("TextButton") then
		addHover(tab)
		tab.MouseButton1Click:Connect(function() selectTab(tab.Name) end)
		if not firstTab or tab.LayoutOrder < firstTab.LayoutOrder then firstTab = tab end
	end
end
if firstTab then selectTab(firstTab.Name) end

-- Boutons ouvrir / fermer
addHover(openButton)
addHover(closeButton)
openButton.MouseButton1Click:Connect(function() setOpen(not isOpen) end)
closeButton.MouseButton1Click:Connect(function() setOpen(false) end)
shop.Visible = false

-- Affichage des pièces
task.spawn(function()
	local coins = player:WaitForChild("leaderstats"):WaitForChild("Coins")
	local function refresh()
		coinsLabel.Text = tostring(coins.Value)
	end
	refresh()
	coins.Changed:Connect(refresh)
end)
]==]
client.Parent = gui

gui.Parent = StarterGui

ChangeHistoryService:SetWaypoint("ShopGui généré")
Selection:Set({ gui })
print("✅ ShopGui généré ! (StarterGui > ShopGui). Ajoute tes articles dans ReplicatedStorage > ShopItems.")

return true
