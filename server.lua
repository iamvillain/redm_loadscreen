
local latestChangelogEntry = nil -- Stores the single latest entry { content, author, timestamp }
local backgroundImageUrlList = {} -- Stores a list of image URLs for the background

-- Function to fetch background images
function FetchBackgroundImages()
    if not Config.EnableDiscordBackgrounds then return end

    local botToken = Config.DiscordBotToken

    if not botToken or botToken == '' or botToken == 'YOUR_DISCORD_BOT_TOKEN_HERE' then
        --print('[LoadScreen] Backgrounds enabled but Discord Bot Token is missing/invalid. Skipping fetch.')
        return
    end

    if not Config.DiscordBackgroundChannelID or Config.DiscordBackgroundChannelID == 'YOUR_BACKGROUND_IMAGE_CHANNEL_ID_HERE' then
         --print('[LoadScreen] Backgrounds enabled but Discord Background Channel ID is missing/invalid. Skipping fetch.')
         return
    end

    local messageLimit = Config.DiscordBackgroundMessageLimit or 50
    local url = ('https://discord.com/api/v10/channels/%s/messages?limit=%d'):format(Config.DiscordBackgroundChannelID, messageLimit)
    local headers = {
        ['Authorization'] = 'Bot ' .. botToken,
        ['Content-Type'] = 'application/json'
    }

    --print(('[LoadScreen] Fetching background images from Discord channel %s (limit %d)...'):format(Config.DiscordBackgroundChannelID, messageLimit))

    PerformHttpRequest(url, function(errorCode, responseData, responseHeaders)
        if errorCode == 200 then
            local data = json.decode(responseData)
            if data and type(data) == 'table' then
                local foundImageUrls = {}
                for _, message in ipairs(data) do
                    if message then
                        if message.attachments and type(message.attachments) == 'table' and #message.attachments > 0 then
                            for _, attachment in ipairs(message.attachments) do
                                if attachment then
                                    --print(('[LoadScreen DEBUG] Processing Attachment: content_type=%s, url=%s, filename=%s'):format(
                                    --    tostring(attachment.content_type),
                                    --    tostring(attachment.url),
                                    --    tostring(attachment.filename)
                                    --))

                                    local isImage = false -- Default to false
                                    local contentType = attachment.content_type or ''
                                    local attachmentUrl = attachment.url -- Store URL locally

                                    -- 1. Primary Check: Content Type (Simpler Substring Check)
                                    -- Check if the string starts with "image/"
                                    -- Add a length check first to prevent error if contentType is too short
                                    if #contentType >= 6 and contentType:sub(1, 6) == 'image/' then
                                        isImage = true
                                        --print("[LoadScreen DEBUG] Identified via ContentType (substring check).")
                                    -- 2. Fallback Check: URL Extension (only if primary failed AND URL exists)
                                    elseif attachmentUrl then
                                        --print("[LoadScreen DEBUG] ContentType check failed, trying URL extension.") -- Added debug line
                                        local urlPath = attachmentUrl:match("([^?]+)") -- Get URL part before any '?'
                                        if urlPath then
                                            --print(('[LoadScreen DEBUG] Checking URL Path: %s'):format(urlPath)) -- Added debug line
                                            if string.match(urlPath:lower(), '%.(jpe?g|png|gif|webp)$') then
                                                isImage = true
                                                --print("[LoadScreen DEBUG] Identified via URL Extension.")
                                            else
                                                --print("[LoadScreen DEBUG] URL Extension check failed.") -- Added debug line
                                            end
                                        else
                                            --print("[LoadScreen DEBUG] Could not extract URL path.") -- Added debug line
                                        end
                                    end
                                    -- Final Decision
                                    if isImage and attachmentUrl then
                                        table.insert(foundImageUrls, attachmentUrl)
                                        --print(('[LoadScreen DEBUG] Added Image URL: %s'):format(attachmentUrl))
                                    else
                                        -- --print more details if it failed
                                        --print(('[LoadScreen DEBUG] Did NOT identify as Image. Final Check Failed. isImage=%s, attachmentUrl exists=%s, contentType=%s'):format(
                                        --    tostring(isImage),
                                        --    tostring(attachmentUrl ~= nil),
                                        --    contentType
                                        --))
                                    end
                                else
                                    --print("[LoadScreen DEBUG] Encountered nil attachment object in message.")
                                end
                            end
                        end
                        if message.embeds and type(message.embeds) == 'table' then
                        for _, embed in ipairs(message.embeds) do
                            if embed.image and embed.image.url then
                                local imageUrl = embed.image.url
                                if imageUrl:match("([^?]+)") and imageUrl:lower():match("%.jpe?g$") or imageUrl:lower():match("%.png$") or imageUrl:lower():match("%.gif$") or imageUrl:lower():match("%.webp$") then
                                    table.insert(foundImageUrls, imageUrl)
                                    --print("[LoadScreen DEBUG] Added Image URL from embed: " .. imageUrl)
                                else
                                    --print("[LoadScreen DEBUG] Embed image URL didn't match supported formats: " .. imageUrl)
                                end
                            end
                        end
                    end
                    else
                        --print("[LoadScreen DEBUG] Encountered nil message object in data array.")
                    end
                end
                -- Check if any URLs were actually found
                if #foundImageUrls > 0 then
                    backgroundImageUrlList = foundImageUrls -- Replace the old list
                    --print(('[LoadScreen] Successfully fetched %d background image URLs.'):format(#backgroundImageUrlList))
                else
                    --print('[LoadScreen] Fetched messages, but found no valid image attachments after processing.')
                end
            else
                --print('[LoadScreen] Failed to parse Discord background image response or no messages found.')
            end
        else
            --print(('[LoadScreen] Error fetching Discord background images: HTTP %d - Response: %s'):format(errorCode, responseData or 'N/A'))
        end
    end, 'GET', '', headers)
end

function FetchLatestChangelog()
    if not Config.EnableChangelog then return end

    local botToken = Config.DiscordBotToken

    if not botToken or botToken == '' or botToken == 'YOUR_DISCORD_BOT_TOKEN_HERE' then
        --print('[LoadScreen] Changelog enabled but Discord Bot Token is missing/invalid. Skipping fetch.')
        return
    end

    if not Config.DiscordChannelID or Config.DiscordChannelID == 'YOUR_DISCORD_CHANNEL_ID_HERE' then
         --print('[LoadScreen] Changelog enabled but Discord Channel ID is missing/invalid. Skipping fetch.')
         return
    end

    local url = ('https://discord.com/api/v10/channels/%s/messages?limit=1'):format(Config.DiscordChannelID)
    local headers = {
        ['Authorization'] = 'Bot ' .. botToken,
        ['Content-Type'] = 'application/json'
    }

    --print(('[LoadScreen] Fetching latest changelog message from Discord channel %s...'):format(Config.DiscordChannelID))

    PerformHttpRequest(url, function(errorCode, responseData, responseHeaders)
        if errorCode == 200 then
            local data = json.decode(responseData) -- Use built-in JSON decode
            if data and type(data) == 'table' and #data > 0 then
                local message = data[1] -- Get the first (and only) message
                -- Add safety check for message object itself
                if message and message.content and message.content ~= "" then
                    -- Add safety check for author object
                    local authorName = "Unknown"
                    if message.author and message.author.username then
                        authorName = message.author.username
                    end
                    latestChangelogEntry = {
                        content = message.content,
                        author = authorName,
                        timestamp = message.timestamp
                    }
                    --print(('[LoadScreen] Successfully fetched latest changelog message by %s.'):format(authorName))
                else
                    latestChangelogEntry = nil -- Clear if latest message is empty/invalid or message object is malformed
                    --print('[LoadScreen] Fetched latest message, but it was empty, invalid, or malformed.')
                end
            else
                latestChangelogEntry = nil -- Clear cache on parse failure or empty response
                --print('[LoadScreen] Failed to parse Discord changelog response or no messages found.')
            end
        else
            -- Don't clear latestChangelogEntry on HTTP error, keep the old one if it exists
            --print(('[LoadScreen] Error fetching Discord changelog: HTTP %d - Response: %s'):format(errorCode, responseData or 'N/A'))
        end
    end, 'GET', '', headers)
end

SetTimeout(3000, FetchLatestChangelog)
SetTimeout(4000, FetchBackgroundImages)

AddEventHandler('playerConnecting', function(playerName, setKickReason, deferrals)
    local source = source
    local connectingPlayerName = GetPlayerName(source) or playerName or "Player" -- Add fallback

    local serverProjectName = GetConvar('sv_projectName', 'RedM Server') -- Get the convar, provide a fallback name
    serverProjectName = serverProjectName:gsub('%^%d', '')

    local randomIndex = math.random(#Config.YouTubeVideoID)
    local randomYouTubeVideo = Config.YouTubeVideoID[randomIndex]

    local handoverData = {
        playerName = connectingPlayerName,
        serverName = serverProjectName,
        logoUrl = Config.LogoURL,
        enableMusic = Config.EnableMusic,
        youtubeVideoId = randomYouTubeVideo,
        initialVolume = Config.InitialVolume,
        messages = Config.Messages,
        enableChangelog = Config.EnableChangelog,
        changelogTitle = Config.ChangelogTitle,
        changelogEntry = latestChangelogEntry, -- Send the single cached entry object (can be nil)
        enableDiscordBackgrounds = Config.EnableDiscordBackgrounds,
        backgroundImageUrls = backgroundImageUrlList -- Send the list of URLs
    }

    deferrals.handover(handoverData)
end)
